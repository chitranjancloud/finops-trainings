import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
    },

    senderId: {
      required: true,
      type: String,
    },

    senderName: {
      type: String,
      default: "",
    },

    senderRole: {
      type: String,
      enum: ["admin", "student", "user"],
      default: "user",
    },

    text: {
      type: String,
      required: true,
    },

    seen: {
      type: Boolean,
      default: false,
    },

    readBy: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Message =
  mongoose.models.Message ||
  mongoose.model("Message", MessageSchema);

export default Message;
