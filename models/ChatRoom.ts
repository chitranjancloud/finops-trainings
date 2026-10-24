import mongoose from "mongoose";

const ChatRoomSchema = new mongoose.Schema(
  {
    // private OR group
    type: {
      type: String,
      enum: ["private", "group"],
      default: "private",
    },

    // group name
    name: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    // all users inside room
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // who created room
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // latest message
    lastMessage: {
      type: String,
      default: "",
    },

    // batch/course group
    batchName: {
      type: String,
      default: "",
    },

    courseName: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const ChatRoom =
  mongoose.models.ChatRoom ||
  mongoose.model("ChatRoom", ChatRoomSchema);

export default ChatRoom;
