import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const TicketCategory = sequelize.define(
  "TicketCategory",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
  },
  {
    tableName: "ticket_categories",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["key"],
      },
      {
        fields: ["is_active"],
      },
    ],
  }
);

export default TicketCategory;
