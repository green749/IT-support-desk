import { Op } from "sequelize";
import { Ticket, TicketReply, User, TicketCategory } from "../models/associations.js";
import TicketActivity from "../models/TicketActivity.js";
import { handleTicketAutoAssignment, getEligibleAgentsWithWorkload } from "../services/ticketAssignment.service.js";

const userFields = ["id", "name", "email", "role", "isActive"];
const includeDetails = [
  { model: User, as: "customer", attributes: userFields },
  { model: User, as: "assignedAgent", attributes: userFields },
  { model: TicketCategory, as: "ticketCategory", attributes: ["id", "key", "name", "isActive"] },
];
const validStatuses = ["open", "assigned", "in_progress", "waiting_for_customer", "resolved", "closed", "reopened"];
const validPriorities = ["low", "medium", "high", "critical"];

function canAccess(ticket, user) {
  if (user.role === "admin") return true;
  if (Number(ticket.customerId) === Number(user.id)) return true;
  if (user.role === "agent" && ticket.assignedAgentId !== null && Number(ticket.assignedAgentId) === Number(user.id)) return true;
  return false;
}

export async function createTicket(req, res) {
  try {
    const { title, description, category, categoryId, priority = "medium" } = req.body;
    if (!title?.trim() || !description?.trim() || !validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Title, description, category and a valid priority are required",
      });
    }

    // Validate category from TicketCategory table
    let categoryRecord = null;
    if (categoryId) {
      categoryRecord = await TicketCategory.findOne({ where: { id: categoryId, isActive: true } });
    } else if (category?.trim()) {
      categoryRecord = await TicketCategory.findOne({
        where: {
          [Op.or]: [
            { key: category.trim().toLowerCase() },
            { name: category.trim() },
          ],
          isActive: true,
        },
      });
    }

    if (!categoryRecord) {
      return res.status(400).json({
        success: false,
        message: "A valid active ticket category is required",
      });
    }

    const ticket = await Ticket.create({
      title: title.trim(),
      description: description.trim(),
      category: categoryRecord.name,
      categoryId: categoryRecord.id,
      priority,
      customerId: req.user.id,
      status: "open",
    });

    // Log activity to MongoDB
    await TicketActivity.create({
      ticketId: ticket.id,
      userId: req.user.id,
      action: "create",
      details: { title: ticket.title, priority: ticket.priority, category: categoryRecord.name },
    });

    // Run backend automatic assignment rules
    await handleTicketAutoAssignment(ticket, categoryRecord);

    const refreshedTicket = await Ticket.findByPk(ticket.id, {
      include: includeDetails,
    });

    return res.status(201).json({ success: true, data: refreshedTicket });
  } catch (error) {
    console.error("Create ticket error:", error);
    return res.status(500).json({ success: false, message: "Unable to create ticket" });
  }
}

export async function listTickets(req, res) {
  try {
    const { search, status, priority, page = 1, limit = 20, sort = "updatedAt", order = "DESC" } = req.query;
    const where = {};
    if (req.user.role === "customer") where.customerId = req.user.id;
    if (req.user.role === "agent") where.assignedAgentId = req.user.id;
    if (status && validStatuses.includes(status)) where.status = status;
    if (priority && validPriorities.includes(priority)) where.priority = priority;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } },
      ];
    }
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const sortField = ["createdAt", "updatedAt", "priority"].includes(sort) ? sort : "updatedAt";
    const sortDirection = order === "ASC" ? "ASC" : "DESC";
    const result = await Ticket.findAndCountAll({
      where,
      include: includeDetails,
      limit: safeLimit,
      offset: (Math.max(Number(page), 1) - 1) * safeLimit,
      order: [[sortField, sortDirection]],
    });
    return res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: safeLimit,
        total: result.count,
        pages: Math.ceil(result.count / safeLimit),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load tickets" });
  }
}

export async function getTicket(req, res) {
  try {
    const ticket = await Ticket.findByPk(req.params.id, {
      include: [
        ...includeDetails,
        {
          model: TicketReply,
          as: "replies",
          required: false,
          include: [{ model: User, as: "author", attributes: userFields }],
        },
      ],
    });
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (!canAccess(ticket, req.user)) {
      return res.status(403).json({ success: false, message: "You do not have permission to view this ticket" });
    }
    if (req.user.role === "customer") {
      ticket.replies = ticket.replies.filter((reply) => !reply.isInternal);
    }
    return res.json({ success: true, data: ticket });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to load ticket" });
  }
}

export async function getEligibleAgents(req, res) {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    let categoryId = ticket.categoryId;
    if (!categoryId && ticket.category) {
      const cat = await TicketCategory.findOne({
        where: {
          [Op.or]: [{ name: ticket.category }, { key: ticket.category.toLowerCase() }],
        },
      });
      if (cat) categoryId = cat.id;
    }

    if (!categoryId) {
      // If uncategorized or no categoryId, return all active agents with workload
      const allAgents = await User.findAll({
        where: { role: "agent", isActive: true },
        attributes: ["id", "name", "email"],
      });
      return res.json({ success: true, data: allAgents.map((a) => ({ ...a.toJSON(), activeTicketsCount: 0 })) });
    }

    const eligible = await getEligibleAgentsWithWorkload(categoryId);
    return res.json({ success: true, data: eligible });
  } catch (error) {
    console.error("Get eligible agents error:", error);
    return res.status(500).json({ success: false, message: "Unable to load eligible agents" });
  }
}

export async function updateTicket(req, res) {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    // Ticket-level authorization check
    if (!canAccess(ticket, req.user)) {
      return res.status(403).json({ success: false, message: "You do not have permission to access this ticket" });
    }

    const updates = {};

    // Validate Priority Update
    if (req.body.priority !== undefined) {
      if (req.user.role === "customer") {
        return res.status(403).json({ success: false, message: "Customers cannot update ticket priority" });
      }
      if (!validPriorities.includes(req.body.priority)) {
        return res.status(400).json({ success: false, message: "Invalid priority value" });
      }
      updates.priority = req.body.priority;
    }

    // Validate Title and Description Update
    if (req.body.title !== undefined || req.body.description !== undefined) {
      if (req.user.role === "customer" && ticket.status !== "open") {
        return res.status(403).json({ success: false, message: "Customers can only update open tickets" });
      }
      if (req.user.role === "agent") {
        return res.status(403).json({ success: false, message: "Agents cannot update ticket description or title" });
      }
      if (req.body.title !== undefined) {
        if (!req.body.title.trim()) return res.status(400).json({ success: false, message: "Title cannot be empty" });
        updates.title = req.body.title.trim();
      }
      if (req.body.description !== undefined) {
        if (!req.body.description.trim()) return res.status(400).json({ success: false, message: "Description cannot be empty" });
        updates.description = req.body.description.trim();
      }
    }

    // Validate Status Update
    if (req.body.status !== undefined) {
      const newStatus = req.body.status;
      const currentStatus = ticket.status;

      const allowedStatuses = ["open", "assigned", "in_progress", "waiting_for_customer", "resolved", "closed", "reopened"];
      if (!allowedStatuses.includes(newStatus)) {
        return res.status(400).json({ success: false, message: "Invalid status value" });
      }

      if (currentStatus === "closed") {
        return res.status(400).json({ success: false, message: "Cannot modify a closed ticket" });
      }

      if (newStatus !== currentStatus) {
        const validTransitions = {
          open: ["assigned", "closed"],
          assigned: ["in_progress", "resolved", "closed"],
          in_progress: ["waiting_for_customer", "resolved", "closed"],
          waiting_for_customer: ["in_progress", "resolved", "closed"],
          resolved: ["closed", "reopened"],
          reopened: ["in_progress", "resolved", "closed"],
          closed: [],
        };

        if (!validTransitions[currentStatus]?.includes(newStatus)) {
          return res.status(400).json({
            success: false,
            message: `Invalid status transition from ${currentStatus} to ${newStatus}`,
          });
        }

        // Role authorization check for status transitions
        if (req.user.role === "customer") {
          if (!["closed", "reopened"].includes(newStatus)) {
            return res.status(403).json({
              success: false,
              message: "Customers are only allowed to close or reopen tickets",
            });
          }
          if (newStatus === "reopened" && currentStatus !== "resolved") {
            return res.status(400).json({
              success: false,
              message: "Tickets can only be reopened if they are currently resolved",
            });
          }
        } else if (req.user.role === "agent") {
          if (!["in_progress", "waiting_for_customer", "resolved"].includes(newStatus)) {
            return res.status(403).json({
              success: false,
              message: "Agents are only allowed to mark tickets in progress, waiting for customer, or resolved",
            });
          }
        }

        updates.status = newStatus;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid update parameters provided" });
    }

    await ticket.update(updates);

    // Log activity to MongoDB
    await TicketActivity.create({
      ticketId: ticket.id,
      userId: req.user.id,
      action: "update",
      details: updates,
    });

    if (updates.status && global.io) {
      global.io.to(`ticket:${ticket.id}`).emit("ticket_status_updated", {
        ticketId: ticket.id,
        status: updates.status,
      });

      const statusLabels = {
        closed: "closed",
        resolved: "marked as resolved",
        reopened: "reopened",
        in_progress: "marked in progress",
        waiting_for_customer: "waiting for employee response",
        assigned: "assigned",
      };

      const actionDesc = statusLabels[updates.status] || `updated to ${updates.status}`;
      const actorName = req.user?.name || "IT Support Specialist";
      const notifPayload = {
        id: `status-${ticket.id}-${Date.now()}`,
        type: `ticket_${updates.status}`,
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        senderId: req.user?.id,
        senderName: actorName,
        message: `Ticket TK-${ticket.id} ("${ticket.title}") was ${actionDesc} by ${actorName}.`,
        status: updates.status,
        createdAt: new Date().toISOString(),
      };

      if (ticket.assignedAgentId && Number(ticket.assignedAgentId) !== Number(req.user.id)) {
        global.io.to(`user:${ticket.assignedAgentId}`).emit("ticket_notification", notifPayload);
      }
      if (ticket.customerId && Number(ticket.customerId) !== Number(req.user.id)) {
        global.io.to(`user:${ticket.customerId}`).emit("ticket_notification", notifPayload);
      }
    }

    return res.json({ success: true, data: ticket });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to update ticket" });
  }
}

export async function assignTicket(req, res) {
  try {
    const ticket = await Ticket.findByPk(req.params.id, { include: includeDetails });
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    // Check if we are unassigning
    const agentId = req.body.agentId;
    if (agentId === null || agentId === "" || agentId === undefined) {
      await ticket.update({ assignedAgentId: null, status: "open" });

      await TicketActivity.create({
        ticketId: ticket.id,
        userId: req.user.id,
        action: "assign",
        details: { assignedAgentId: null, agentName: "Unassigned", assignedBy: "admin" },
      });

      if (global.io) {
        global.io.to(`ticket:${ticket.id}`).emit("ticket_assigned", {
          ticketId: ticket.id,
          title: ticket.title,
          assignedAgentId: null,
          status: "open",
        });
        global.io.to(`ticket:${ticket.id}`).emit("ticket_status_updated", {
          ticketId: ticket.id,
          status: "open",
        });
      }

      const refreshed = await Ticket.findByPk(ticket.id, { include: includeDetails });
      return res.json({ success: true, data: refreshed });
    }

    const agent = await User.findOne({ where: { id: agentId, role: "agent", isActive: true } });
    if (!agent) return res.status(400).json({ success: false, message: "Active agent not found" });

    await ticket.update({ assignedAgentId: agent.id, status: "assigned" });

    // Log activity to MongoDB
    await TicketActivity.create({
      ticketId: ticket.id,
      userId: req.user.id,
      action: "assign",
      details: { assignedAgentId: agent.id, agentName: agent.name, assignedBy: "admin" },
    });

    if (global.io) {
      const assignmentPayload = {
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        category: ticket.category,
        priority: ticket.priority,
        assignedBy: "admin",
        message: "An IT support ticket has been assigned to you by an administrator.",
      };

      global.io.to(`user:${agent.id}`).emit("ticket_assigned", assignmentPayload);
      global.io.to(`ticket:${ticket.id}`).emit("ticket_assigned", {
        ticketId: ticket.id,
        title: ticket.title,
        assignedAgentId: agent.id,
        status: "assigned",
      });
      global.io.to(`ticket:${ticket.id}`).emit("ticket_status_updated", {
        ticketId: ticket.id,
        status: "assigned",
      });
    }

    const refreshed = await Ticket.findByPk(ticket.id, { include: includeDetails });
    return res.json({ success: true, data: refreshed });
  } catch (error) {
    console.error("Assign ticket error:", error);
    return res.status(500).json({ success: false, message: "Unable to assign ticket" });
  }
}

export async function addReply(req, res) {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    if (!canAccess(ticket, req.user)) {
      return res.status(403).json({ success: false, message: "You do not have permission to reply to this ticket" });
    }

    // Cannot reply to closed tickets
    if (ticket.status === "closed") {
      return res.status(400).json({ success: false, message: "Cannot reply to a closed ticket" });
    }

    const message = req.body.message?.trim();
    const isInternal = Boolean(req.body.isInternal);
    if (!message) return res.status(400).json({ success: false, message: "Reply message is required" });
    if (isInternal && req.user.role === "customer") {
      return res.status(403).json({ success: false, message: "Customers cannot add internal notes" });
    }
    const reply = await TicketReply.create({ ticketId: ticket.id, userId: req.user.id, message, isInternal });
    let statusUpdated = false;
    if (req.user.role === "customer" && ticket.status === "waiting_for_customer") {
      await ticket.update({ status: "in_progress" });
      statusUpdated = true;
    }

    // Log activity to MongoDB
    await TicketActivity.create({
      ticketId: ticket.id,
      userId: req.user.id,
      action: "reply",
      details: { replyId: reply.id, isInternal },
    });

    const savedReply = await TicketReply.findByPk(reply.id, {
      include: [{ model: User, as: "author", attributes: userFields }],
    });

    if (global.io) {
      if (isInternal) {
        const sockets = await global.io.in(`ticket:${ticket.id}`).fetchSockets();
        for (const s of sockets) {
          if (s.user && s.user.role !== "customer") {
            s.emit("new_ticket_message", savedReply);
          }
        }
      } else {
        global.io.to(`ticket:${ticket.id}`).emit("new_ticket_message", savedReply);
      }
      const notificationPayload = {
        id: `msg-${reply.id}`,
        type: "message",
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        senderId: req.user.id,
        senderName: req.user.name,
        message: reply.message,
        isInternal,
        createdAt: reply.createdAt || new Date(),
      };

      if (!isInternal && Number(ticket.customerId) !== Number(req.user.id)) {
        global.io.to(`user:${ticket.customerId}`).emit("ticket_notification", notificationPayload);
      }
      if (ticket.assignedAgentId && Number(ticket.assignedAgentId) !== Number(req.user.id)) {
        global.io.to(`user:${ticket.assignedAgentId}`).emit("ticket_notification", notificationPayload);
      }

      if (statusUpdated) {
        global.io.to(`ticket:${ticket.id}`).emit("ticket_status_updated", {
          ticketId: ticket.id,
          status: "in_progress",
        });
      }
    }

    return res.status(201).json({ success: true, data: savedReply });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to send reply" });
  }
}

export async function deleteTicket(req, res) {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
    const ownsOpenTicket = req.user.role === "customer" && ticket.customerId === req.user.id && ticket.status === "open";
    if (req.user.role !== "admin" && !ownsOpenTicket) {
      return res.status(403).json({ success: false, message: "Only open tickets you created can be deleted" });
    }

    // Log activity to MongoDB
    await TicketActivity.create({
      ticketId: ticket.id,
      userId: req.user.id,
      action: "delete",
      details: { title: ticket.title },
    });

    await ticket.destroy();
    return res.json({ success: true, message: "Ticket deleted" });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to delete ticket" });
  }
}

export async function resolveTicket(req, res) {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    // Check authorization: Admin or assigned Agent can resolve
    const isAssignedAgent = req.user.role === "agent" && ticket.assignedAgentId !== null && Number(ticket.assignedAgentId) === Number(req.user.id);
    const isAdmin = req.user.role === "admin";
    if (!isAdmin && !isAssignedAgent) {
      return res.status(403).json({ success: false, message: "Only the assigned agent or an admin can resolve this ticket" });
    }

    // Validate resolution message
    const message = req.body.message?.trim();
    if (!message) {
      return res.status(400).json({ success: false, message: "Resolution message is required" });
    }
    if (message.length > 5000) {
      return res.status(400).json({ success: false, message: "Message exceeds maximum length of 5000 characters" });
    }

    const currentStatus = ticket.status;
    if (currentStatus === "closed") {
      return res.status(400).json({ success: false, message: "Cannot resolve a closed ticket" });
    }

    // Save resolution message as a ticket reply
    const reply = await TicketReply.create({
      ticketId: ticket.id,
      userId: req.user.id,
      message,
      isInternal: false,
    });

    await ticket.update({ status: "resolved" });

    // Log activity to MongoDB
    await TicketActivity.create({
      ticketId: ticket.id,
      userId: req.user.id,
      action: "update",
      details: { status: "resolved", replyId: reply.id },
    });

    // Populate reply author
    const replyWithAuthor = await TicketReply.findByPk(reply.id, {
      include: [{ model: User, as: "author", attributes: userFields }],
    });

    // Broadcast messages through Socket.IO
    if (global.io) {
      global.io.to(`ticket:${ticket.id}`).emit("new_ticket_message", replyWithAuthor);
      global.io.to(`ticket:${ticket.id}`).emit("ticket_status_updated", {
        ticketId: ticket.id,
        status: "resolved",
      });
    }

    return res.json({ success: true, data: ticket, reply: replyWithAuthor });
  } catch (error) {
    console.error("Resolve ticket error:", error);
    return res.status(500).json({ success: false, message: "Unable to resolve ticket" });
  }
}
