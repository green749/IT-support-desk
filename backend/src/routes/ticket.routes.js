import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { csrfProtection } from "../middleware/csrf.middleware.js";
import { addReply, assignTicket, createTicket, deleteTicket, getTicket, listTickets, updateTicket, resolveTicket, getEligibleAgents } from "../controllers/ticket.controller.js";

const router = express.Router();
router.use(authenticateToken);
router.get("/", listTickets);
router.post("/", csrfProtection, authorize("customer", "admin"), createTicket);
router.get("/:id", getTicket);
router.get("/:id/eligible-agents", authorize("admin"), getEligibleAgents);
router.patch("/:id", csrfProtection, updateTicket);
router.delete("/:id", csrfProtection, deleteTicket);
router.patch("/:id/assign", csrfProtection, authorize("admin"), assignTicket);
router.post("/:id/assign", csrfProtection, authorize("admin"), assignTicket);
router.post("/:id/replies", csrfProtection, addReply);
router.post("/:id/resolve", csrfProtection, authorize("agent", "admin"), resolveTicket);
export default router;
