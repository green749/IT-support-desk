import "./config/env.js";
import "./models/associations.js";
import app from "./app.js";
import sequelize, { connectDatabase } from "./config/database.js";
import { connectMongoDB } from "./config/mongodb.js";
import http from "http";
import { seedCategories } from "./utils/seedCategories.js";
import { migrateSchema } from "./utils/migrateSchema.js";
import { initSocket } from "./services/socket.service.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDatabase();

    await migrateSchema();

    await sequelize.sync();

    await seedCategories();

    await connectMongoDB();

    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(
      "Server startup failed:",
      error.message
    );

    process.exit(1);
  }
}

startServer();
