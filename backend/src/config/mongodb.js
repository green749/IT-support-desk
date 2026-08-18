import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export async function connectMongoDB() {
  try {
    if (!process.env.MONGO_URI || process.env.MONGO_URI.includes("127.0.0.1") && process.env.NODE_ENV === "production") {
      console.warn("⚠️ Warning: Local MONGO_URI detected in production. Skipping local MongoDB connection.");
      return;
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.warn("MongoDB connection warning (Audit logging degraded):", error.message);
  }
}