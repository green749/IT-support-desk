import { Op, fn, col } from "sequelize";
import { User, Ticket, TicketCategory, AgentCategory } from "../models/associations.js";
import TicketActivity from "../models/TicketActivity.js";

/**
 * Find active IT Support Agents mapped to a specific ticket category.
 */
export async function findMatchingAgents(categoryId) {
  if (!categoryId) return [];

  const agents = await User.findAll({
    where: {
      role: "agent",
      isActive: true,
    },
    include: [
      {
        model: AgentCategory,
        as: "agentCategories",
        where: { categoryId },
        required: true,
        attributes: [],
      },
    ],
    attributes: ["id", "name", "email", "role", "isActive"],
  });

  return agents;
}

/**
 * Get active IT agents matching category along with their current active ticket workload.
 */
export async function getEligibleAgentsWithWorkload(categoryId) {
  const agents = await findMatchingAgents(categoryId);

  if (!agents || agents.length === 0) {
    return [];
  }

  const agentIds = agents.map((a) => a.id);

  // Active statuses
  const activeStatuses = ["open", "assigned", "in_progress", "waiting_for_customer"];

  const workloadCounts = await Ticket.findAll({
    where: {
      assignedAgentId: { [Op.in]: agentIds },
      status: { [Op.in]: activeStatuses },
    },
    attributes: ["assignedAgentId", [fn("COUNT", col("id")), "count"]],
    group: ["assignedAgentId"],
    raw: true,
  });

  const countMap = {};
  workloadCounts.forEach((w) => {
    countMap[w.assignedAgentId] = Number(w.count);
  });

  return agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    email: agent.email,
    activeTicketsCount: countMap[agent.id] || 0,
  }));
}

/**
 * Notify all admin users via Socket.IO
 */
export function notifyAdmins(event, payload) {
  if (!global.io) return;
  global.io.to("admins").emit(event, payload);
}

/**
 * Handle automatic ticket assignment logic based on category and matching agents.
 */
export async function handleTicketAutoAssignment(ticket, category) {
  try {
    const isOtherCategory =
      category &&
      (category.key === "other" ||
        String(category.name).toLowerCase() === "other" ||
        String(ticket.category).toLowerCase() === "other");

    // RULE: "Other" category always goes to manual assignment
    if (isOtherCategory) {
      const payload = {
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        category: category ? category.name : ticket.category,
        priority: ticket.priority,
        matchingAgents: [],
        message: `Ticket #${ticket.id} requires manual assignment (Category: Other).`,
      };
      notifyAdmins("ticket_assignment_required", payload);
      return { assigned: false, reason: "other_category", matchingCount: 0 };
    }

    const categoryId = category ? category.id : ticket.categoryId;
    const matchingAgents = categoryId ? await findMatchingAgents(categoryId) : [];
    const count = matchingAgents.length;
    const categoryName = category ? category.name : ticket.category || "Uncategorized";

    // RULE A — ZERO MATCHING AGENTS
    if (count === 0) {
      const payload = {
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        category: categoryName,
        priority: ticket.priority,
        matchingAgents: [],
        message: `Ticket #${ticket.id} requires manual assignment. No active IT agent is available for ${categoryName}.`,
      };
      notifyAdmins("ticket_assignment_required", payload);
      return { assigned: false, reason: "no_agents", matchingCount: 0 };
    }

    // RULE B — EXACTLY ONE MATCHING AGENT
    if (count === 1) {
      const matchingAgent = matchingAgents[0];
      await ticket.update({
        assignedAgentId: matchingAgent.id,
        status: "assigned",
      });

      // Log assignment activity in MongoDB
      await TicketActivity.create({
        ticketId: ticket.id,
        userId: ticket.customerId,
        action: "assign",
        details: {
          assignedAgentId: matchingAgent.id,
          agentName: matchingAgent.name,
          assignedBy: "system",
        },
      });

      // Send real-time Socket.IO notification to the agent's room
      if (global.io) {
        const assignmentPayload = {
          ticketId: ticket.id,
          ticketTitle: ticket.title,
          category: categoryName,
          priority: ticket.priority,
          assignedBy: "system",
          message: "A new IT support ticket has been automatically assigned to you.",
        };

        global.io.to(`user:${matchingAgent.id}`).emit("ticket_assigned", assignmentPayload);
        global.io.to(`ticket:${ticket.id}`).emit("ticket_assigned", {
          ticketId: ticket.id,
          title: ticket.title,
          assignedAgentId: matchingAgent.id,
          status: "assigned",
        });
        global.io.to(`ticket:${ticket.id}`).emit("ticket_status_updated", {
          ticketId: ticket.id,
          status: "assigned",
        });
      }

      return { assigned: true, agent: matchingAgent, matchingCount: 1 };
    }

    // RULE C — TWO OR MORE MATCHING AGENTS
    if (count >= 2) {
      const payload = {
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        category: categoryName,
        priority: ticket.priority,
        matchingAgents: matchingAgents.map((a) => ({ id: a.id, name: a.name, email: a.email })),
        message: `Ticket #${ticket.id} requires manual assignment (${count} matching IT agents found).`,
      };

      notifyAdmins("ticket_assignment_required", payload);
      return { assigned: false, reason: "multiple_agents", matchingCount: count, matchingAgents };
    }
  } catch (error) {
    console.error("Auto-assignment error:", error);
    return { assigned: false, error: error.message };
  }
}
