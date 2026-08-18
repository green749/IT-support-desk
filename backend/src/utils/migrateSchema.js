import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export async function migrateSchema() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();

    // If tickets table exists, ensure category_id column is present
    if (tables.includes("tickets")) {
      const tableDef = await queryInterface.describeTable("tickets");
      if (!tableDef.category_id && !tableDef.categoryId) {
        console.log("Adding category_id column to tickets table...");
        await queryInterface.addColumn("tickets", "category_id", {
          type: DataTypes.BIGINT.UNSIGNED,
          allowNull: true,
        });
      }
    }
  } catch (error) {
    console.error("Schema migration check error:", error.message);
  }
}
