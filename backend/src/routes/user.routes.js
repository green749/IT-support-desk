import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { csrfProtection } from "../middleware/csrf.middleware.js";
import { getUser, listUsers, updateUser, getAgentCategories } from "../controllers/user.controller.js";

const router = express.Router();

router.use(authenticateToken);

// Admin-only user list
router.get("/", authorize("admin"), listUsers);

// User or admin can view profile
router.get("/:id", (req, res, next) => {
  if (req.user.role === "admin" || Number(req.user.id) === Number(req.params.id)) {
    return next();
  }
  return res.status(403).json({ success: false, message: "Forbidden" });
}, getUser);

// Agent, Admin, or the user themselves can view their assigned categories
router.get("/:id/categories", (req, res, next) => {
  if (req.user.role === "admin" || req.user.role === "agent" || Number(req.user.id) === Number(req.params.id)) {
    return next();
  }
  return res.status(403).json({ success: false, message: "Forbidden" });
}, getAgentCategories);

router.get("/:id/agent-categories", (req, res, next) => {
  if (req.user.role === "admin" || req.user.role === "agent" || Number(req.user.id) === Number(req.params.id)) {
    return next();
  }
  return res.status(403).json({ success: false, message: "Forbidden" });
}, getAgentCategories);

// Admin-only modifications
router.patch("/:id", authorize("admin"), csrfProtection, updateUser);
router.put("/:id", authorize("admin"), csrfProtection, updateUser);
router.put("/:id/categories", authorize("admin"), csrfProtection, updateUser);
router.put("/:id/agent-categories", authorize("admin"), csrfProtection, updateUser);

export default router;
