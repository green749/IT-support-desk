import mongoose from "mongoose";

const TicketActivitySchema = new mongoose.Schema(
  {
    ticketId: {
      type: Number,
      required: false,
      index: true,
    },
    userId: {
      type: Number,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: ["create", "update", "assign", "reply", "delete", "role_change"],
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: "timestamp", updatedAt: false },
  }
);

const TicketActivity = mongoose.model("TicketActivity", TicketActivitySchema);

export default TicketActivity;
