import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Ticket = sequelize.define("Ticket", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING(180), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  category: { type: DataTypes.STRING(80), allowNull: false, defaultValue: "Uncategorized" },
  categoryId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: "category_id" },
  priority: { type: DataTypes.ENUM("low", "medium", "high", "critical"), allowNull: false, defaultValue: "medium" },
  status: { type: DataTypes.ENUM("open", "assigned", "in_progress", "waiting_for_customer", "resolved", "closed", "reopened"), allowNull: false, defaultValue: "open" },
  customerId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "customer_id" },
  assignedAgentId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, defaultValue: null, field: "assigned_agent_id" },
}, { tableName: "tickets", timestamps: true, underscored: true, indexes: [{ fields: ["customer_id"] }, { fields: ["assigned_agent_id", "status"] }, { fields: ["status", "priority"] }, { fields: ["category_id"] }] });

export default Ticket;
