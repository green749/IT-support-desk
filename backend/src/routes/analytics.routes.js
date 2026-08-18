import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { dashboardAnalytics } from "../controllers/analytics.controller.js";

const router = express.Router();
router.get("/dashboard", authenticateToken, authorize("admin"), dashboardAnalytics);
export default router;
