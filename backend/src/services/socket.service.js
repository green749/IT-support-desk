import { Server } from "socket.io";
import { verifyAccessToken } from "../utils/jwt.js";
import User from "../models/User.js";
import { Ticket, TicketReply } from "../models/associations.js";
import TicketActivity from "../models/TicketActivity.js";

let io = null;

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    list[parts.shift().trim()] = decodeURIComponent(parts.join("="));
  });
  return list;
}

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
    transports: ["websocket"],
  });

  // Share io globally so controllers can emit events
  global.io = io;

  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const cookies = parseCookies(cookieHeader);
      let token = cookies.accessToken;

      if (!token && socket.handshake.auth?.token) {
        token = socket.handshake.auth.token;
      }
      if (!token && socket.handshake.headers?.authorization?.startsWith("Bearer ")) {
        token = socket.handshake.headers.authorization.split(" ")[1];
      }

      if (!token) {
        return next(new Error("Authentication error: Access token missing"));
      }

      const decoded = verifyAccessToken(token);
      if (decoded.type !== "access") {
        return next(new Error("Authentication error: Invalid access token"));
      }

      const user = await User.findByPk(decoded.userId, {
        attributes: ["id", "name", "role", "isActive"],
      });

      if (!user || !user.isActive) {
        return next(new Error("Authentication error: User inactive or not found"));
      }

      socket.user = {
        id: Number(user.id),
        name: user.name,
        role: user.role,
      };

      next();
    } catch (error) {
      console.error("Socket authentication failed:", error.message);
      return next(new Error("Authentication error: " + error.message));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket client connected: ${socket.id} (User: ${socket.user.name}, Role: ${socket.user.role})`);

    // In-memory rate limiting per socket connection
    socket.messageTimestamps = [];

    // Join personal user room for direct notifications
    socket.join(`user:${socket.user.id}`);

    // Join admins room if user is an IT Administrator
    if (socket.user.role === "admin") {
      socket.join("admins");
    }

    // Helper to check ticket authorization
    const checkTicketAuth = async (ticketId) => {
      const ticket = await Ticket.findByPk(ticketId);
      if (!ticket) return { authorized: false, status: 404, message: "Ticket not found" };

      if (socket.user.role === "admin") return { authorized: true, ticket };
      if (Number(ticket.customerId) === socket.user.id) return { authorized: true, ticket };
      if (
        socket.user.role === "agent" &&
        ticket.assignedAgentId !== null &&
        Number(ticket.assignedAgentId) === socket.user.id
      ) {
        return { authorized: true, ticket };
      }

      return { authorized: false, status: 403, message: "Forbidden: You do not have access to this ticket" };
    };

    // Join Ticket Room
    socket.on("join_ticket", async (data) => {
      try {
        const ticketId = Number(data?.ticketId);
        if (!ticketId || isNaN(ticketId)) {
          return socket.emit("error_message", { message: "Invalid ticket ID" });
        }

        const auth = await checkTicketAuth(ticketId);
        if (!auth.authorized) {
          console.warn(`Unauthorized join attempt to ticket:${ticketId} by User:${socket.user.id}`);
          return socket.emit("authorization_error", { ticketId, message: auth.message });
        }

        socket.join(`ticket:${ticketId}`);
        console.log(`Socket ${socket.id} (User: ${socket.user.id}) joined room ticket:${ticketId}`);
      } catch (error) {
        socket.emit("error_message", { message: "Failed to join ticket room" });
      }
    });

    // Leave Ticket Room
    socket.on("leave_ticket", (data) => {
      const ticketId = Number(data?.ticketId);
      if (ticketId) {
        socket.leave(`ticket:${ticketId}`);
        console.log(`Socket ${socket.id} left room ticket:${ticketId}`);
      }
    });

    // Send Ticket Message
    socket.on("send_ticket_message", async (data) => {
      try {
        const ticketId = Number(data?.ticketId);
        const rawMessage = data?.message;
        const isInternal = Boolean(data?.isInternal);

        // Rate limiting: max 30 messages per minute
        const now = Date.now();
        socket.messageTimestamps = socket.messageTimestamps.filter((t) => now - t < 60000);
        if (socket.messageTimestamps.length >= 30) {
          return socket.emit("error_message", { message: "Rate limit exceeded. Please wait a moment." });
        }
        socket.messageTimestamps.push(now);

        // Validation
        if (!ticketId || isNaN(ticketId)) {
          return socket.emit("error_message", { message: "Invalid ticket ID" });
        }
        const message = rawMessage?.trim();
        if (!message) {
          return socket.emit("error_message", { message: "Message content cannot be empty" });
        }
        if (message.length > 5000) {
          return socket.emit("error_message", { message: "Message exceeds maximum length of 5000 characters" });
        }

        // Authorization
        const auth = await checkTicketAuth(ticketId);
        if (!auth.authorized) {
          return socket.emit("authorization_error", { ticketId, message: auth.message });
        }

        const ticket = auth.ticket;

        // Cannot message closed tickets
        if (ticket.status === "closed") {
          return socket.emit("error_message", { message: "Cannot reply to a closed ticket" });
        }

        // Customers cannot send internal notes
        const internalFlag = isInternal && socket.user.role !== "customer";

        // Save reply to MySQL
        const reply = await TicketReply.create({
          ticketId: ticket.id,
          userId: socket.user.id,
          message,
          isInternal: internalFlag,
        });

        // Automatically update ticket status if waiting for customer
        let statusUpdated = false;
        if (socket.user.role === "customer" && ticket.status === "waiting_for_customer") {
          await ticket.update({ status: "in_progress" });
          statusUpdated = true;
        }

        // Log activity to MongoDB
        await TicketActivity.create({
          ticketId: ticket.id,
          userId: socket.user.id,
          action: "reply",
          details: { replyId: reply.id, isInternal: internalFlag },
        });

        // Fetch reply with author details to send back to clients
        const savedReply = await TicketReply.findByPk(reply.id, {
          include: [
            {
              model: User,
              as: "author",
              attributes: ["id", "name", "email", "role", "isActive"],
            },
          ],
        });

        // Broadcast logic (internal notes must hide from customers)
        if (internalFlag) {
          const sockets = await io.in(`ticket:${ticketId}`).fetchSockets();
          for (const s of sockets) {
            if (s.user && s.user.role !== "customer") {
              s.emit("new_ticket_message", savedReply);
            }
          }
        } else {
          io.to(`ticket:${ticketId}`).emit("new_ticket_message", savedReply);
        }

        // Emit notification payload
        const notificationPayload = {
          id: `msg-${reply.id}`,
          type: "message",
          ticketId: ticket.id,
          ticketTitle: ticket.title,
          senderId: socket.user.id,
          senderName: socket.user.name,
          message: reply.message,
          isInternal: internalFlag,
          createdAt: reply.createdAt || new Date(),
        };

        if (!internalFlag && Number(ticket.customerId) !== Number(socket.user.id)) {
          io.to(`user:${ticket.customerId}`).emit("ticket_notification", notificationPayload);
        }
        if (ticket.assignedAgentId && Number(ticket.assignedAgentId) !== Number(socket.user.id)) {
          io.to(`user:${ticket.assignedAgentId}`).emit("ticket_notification", notificationPayload);
        }

        // Emit status update if changed
        if (statusUpdated) {
          io.to(`ticket:${ticketId}`).emit("ticket_status_updated", {
            ticketId: ticket.id,
            status: "in_progress",
          });
        }
      } catch (error) {
        console.error("Failed to process socket message:", error);
        socket.emit("error_message", { message: "Failed to send message" });
      }
    });

    // Typing Indicators
    socket.on("typing_started", async (data) => {
      try {
        const ticketId = Number(data?.ticketId);
        if (!ticketId || isNaN(ticketId)) return;

        const auth = await checkTicketAuth(ticketId);
        if (!auth.authorized) return;

        socket.to(`ticket:${ticketId}`).emit("typing_status", {
          ticketId,
          userId: socket.user.id,
          userName: socket.user.name,
          isTyping: true,
        });
      } catch (error) {
        // Suppress typing errors
      }
    });

    socket.on("typing_stopped", async (data) => {
      try {
        const ticketId = Number(data?.ticketId);
        if (!ticketId || isNaN(ticketId)) return;

        const auth = await checkTicketAuth(ticketId);
        if (!auth.authorized) return;

        socket.to(`ticket:${ticketId}`).emit("typing_status", {
          ticketId,
          userId: socket.user.id,
          userName: socket.user.name,
          isTyping: false,
        });
      } catch (error) {
        // Suppress typing errors
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.id} (Reason: ${reason})`);
    });
  });
}

export function getIO() {
  return io;
}
