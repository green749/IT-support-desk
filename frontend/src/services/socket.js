import { io } from "socket.io-client";
import { authService } from "./auth.service";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socket = null;
let isRefreshing = false;

export const socketService = {
  connect() {
    if (socket) {
      if (!socket.connected) {
        socket.connect();
      }
      return socket;
    }

    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Socket.IO connected successfully:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket.IO disconnected:", reason);
    });

    socket.on("connect_error", async (error) => {
      console.error("Socket.IO connection error:", error.message);

      // Handle token expiry / authentication failure
      if (error.message && error.message.includes("Authentication error")) {
        if (isRefreshing) return;
        isRefreshing = true;

        console.log("Socket connection failed due to auth. Attempting session/cookie refresh...");
        try {
          // Trigger the '/auth/me' call which will automatically refresh the access token via HttpOnly cookies
          await authService.me();
          console.log("Session refresh succeeded, retrying socket connection...");
          socket.connect();
        } catch (refreshError) {
          console.error("Session refresh failed. User might need to log in again.", refreshError);
        } finally {
          isRefreshing = false;
        }
      }
    });

    socket.connect();
    return socket;
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  getSocket() {
    return socket;
  },

  joinTicket(ticketId) {
    if (socket) {
      socket.emit("join_ticket", { ticketId });
    }
  },

  leaveTicket(ticketId) {
    if (socket) {
      socket.emit("leave_ticket", { ticketId });
    }
  },

  sendMessage(ticketId, message, isInternal = false) {
    if (socket) {
      socket.emit("send_ticket_message", { ticketId, message, isInternal });
    }
  },

  startTyping(ticketId) {
    if (socket) {
      socket.emit("typing_started", { ticketId });
    }
  },

  stopTyping(ticketId) {
    if (socket) {
      socket.emit("typing_stopped", { ticketId });
    }
  }
};
