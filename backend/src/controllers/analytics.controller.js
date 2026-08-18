import { fn, col, Op } from "sequelize";
import { Ticket, User, TicketCategory } from "../models/associations.js";
import { getEligibleAgentsWithWorkload } from "../services/ticketAssignment.service.js";

async function grouped(field) {
  return Ticket.findAll({ attributes: [field, [fn("COUNT", col("id")), "count"]], group: [field], raw: true });
}

export async function dashboardAnalytics(req, res) {
  try {
    const [
      totalTickets,
      totalUsers,
      totalCustomers,
      totalAgents,
      unassignedCount,
      byStatus,
      byPriority,
      byCategory,
      workload,
      unassignedTickets,
    ] = await Promise.all([
      Ticket.count(),
      User.count(),
      User.count({ where: { role: "customer" } }),
      User.count({ where: { role: "agent" } }),
      Ticket.count({ where: { assignedAgentId: null, status: { [Op.notIn]: ["resolved", "closed"] } } }),
      grouped("status"),
      grouped("priority"),
      grouped("category"),
      Ticket.findAll({
        attributes: ["assignedAgentId", [fn("COUNT", col("Ticket.id")), "count"]],
        include: [{ model: User, as: "assignedAgent", attributes: ["id", "name"], required: true }],
        group: ["assignedAgentId", "assignedAgent.id", "assignedAgent.name"],
        raw: true,
      }),
      Ticket.findAll({
        where: { assignedAgentId: null, status: { [Op.notIn]: ["resolved", "closed"] } },
        include: [
          { model: User, as: "customer", attributes: ["id", "name", "email"] },
          { model: TicketCategory, as: "ticketCategory", attributes: ["id", "key", "name"] },
        ],
        order: [["createdAt", "DESC"]],
        limit: 15,
      }),
    ]);

    const openCount = byStatus
      .filter((row) => row.status === "open" || row.status === "assigned")
      .reduce((sum, row) => sum + Number(row.count || 0), 0);
    const inProgressCount = byStatus
      .filter((row) => row.status === "in_progress" || row.status === "waiting_for_customer")
      .reduce((sum, row) => sum + Number(row.count || 0), 0);
    const resolved = byStatus
      .filter((row) => row.status === "resolved" || row.status === "closed")
      .reduce((sum, row) => sum + Number(row.count || 0), 0);
    const critical = byPriority.find((row) => row.priority === "critical")?.count || 0;
    const high = byPriority.find((row) => row.priority === "high")?.count || 0;
    const criticalHigh = Number(critical) + Number(high);

    // Calculate matching agent count for each unassigned ticket
    const ticketsNeedingAssignment = await Promise.all(
      unassignedTickets.map(async (t) => {
        const catId = t.categoryId || t.ticketCategory?.id;
        let matchingCount = 0;
        if (catId) {
          const eligible = await getEligibleAgentsWithWorkload(catId);
          matchingCount = eligible.length;
        }
        return {
          id: t.id,
          title: t.title,
          category: t.category || t.ticketCategory?.name || "Uncategorized",
          categoryId: catId,
          priority: t.priority,
          status: t.status,
          createdAt: t.createdAt,
          customer: t.customer,
          matchingAgentCount: matchingCount,
        };
      })
    );

    return res.json({
      success: true,
      data: {
        totals: {
          tickets: totalTickets,
          users: totalUsers,
          customers: totalCustomers,
          agents: totalAgents,
          open: Number(openCount),
          inProgress: Number(inProgressCount),
          resolved: Number(resolved),
          unassigned: Number(unassignedCount),
          critical: Number(critical),
          high: Number(high),
          criticalHigh,
          requiringAssignment: Number(unassignedCount),
        },
        byStatus,
        byPriority,
        byCategory,
        workload,
        unassignedTickets: ticketsNeedingAssignment,
      },
    });
  } catch (error) {
    console.error("Dashboard analytics error:", error);
    return res.status(500).json({ success: false, message: "Unable to load analytics" });
  }
}
