import User from "./User.js";
import Ticket from "./Ticket.js";
import TicketReply from "./TicketReply.js";
import TicketCategory from "./TicketCategory.js";
import AgentCategory from "./AgentCategory.js";

// User <-> Ticket
User.hasMany(Ticket, { as: "createdTickets", foreignKey: "customerId" });
Ticket.belongsTo(User, { as: "customer", foreignKey: "customerId" });
User.hasMany(Ticket, { as: "assignedTickets", foreignKey: "assignedAgentId" });
Ticket.belongsTo(User, { as: "assignedAgent", foreignKey: "assignedAgentId" });

// Ticket <-> TicketReply
Ticket.hasMany(TicketReply, { as: "replies", foreignKey: "ticketId", onDelete: "CASCADE" });
TicketReply.belongsTo(Ticket, { foreignKey: "ticketId" });
User.hasMany(TicketReply, { as: "replies", foreignKey: "userId" });
TicketReply.belongsTo(User, { as: "author", foreignKey: "userId" });

// Ticket <-> TicketCategory
TicketCategory.hasMany(Ticket, { as: "tickets", foreignKey: "categoryId" });
Ticket.belongsTo(TicketCategory, { as: "ticketCategory", foreignKey: "categoryId" });

// User <-> TicketCategory (Many-to-Many via AgentCategory)
User.belongsToMany(TicketCategory, { through: AgentCategory, as: "supportCategories", foreignKey: "agentId", otherKey: "categoryId" });
TicketCategory.belongsToMany(User, { through: AgentCategory, as: "agents", foreignKey: "categoryId", otherKey: "agentId" });

User.hasMany(AgentCategory, { as: "agentCategories", foreignKey: "agentId", onDelete: "CASCADE" });
AgentCategory.belongsTo(User, { as: "agent", foreignKey: "agentId" });

TicketCategory.hasMany(AgentCategory, { as: "categoryAgents", foreignKey: "categoryId", onDelete: "CASCADE" });
AgentCategory.belongsTo(TicketCategory, { as: "category", foreignKey: "categoryId" });

export { User, Ticket, TicketReply, TicketCategory, AgentCategory };

