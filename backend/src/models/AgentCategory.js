import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const AgentCategory = sequelize.define(
  "AgentCategory",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    agentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "agent_id",
    },
    categoryId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "category_id",
    },
  },
  {
    tableName: "agent_categories",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["agent_id", "category_id"],
      },
      {
        fields: ["category_id"],
      },
    ],
  }
);

export default AgentCategory;
