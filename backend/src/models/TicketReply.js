import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const TicketReply = sequelize.define("TicketReply", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  message: { type: DataTypes.TEXT, allowNull: false },
  isInternal: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "is_internal" },
  ticketId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "ticket_id" },
  userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: "user_id" },
}, { tableName: "ticket_replies", timestamps: true, underscored: true, indexes: [{ fields: ["ticket_id", "created_at"] }] });

export default TicketReply;
