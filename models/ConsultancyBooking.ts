import mongoose from "mongoose";

const GuestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
  },
  { _id: false }
);

const ConsultancyBookingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    bookingDate: {
      type: String,
      required: true,
      trim: true,
    },
    bookingTime: {
      type: String,
      required: true,
      trim: true,
    },
    durationMinutes: {
      type: Number,
      default: 30,
    },
    meetingLink: {
      type: String,
      default: "",
      trim: true,
    },
    guests: [GuestSchema],
    status: {
      type: String,
      enum: ["booked", "replied", "cancelled"],
      default: "booked",
    },
    adminReply: {
      type: String,
      default: "",
    },
    repliedAt: Date,
    emailSentToUser: {
      type: Boolean,
      default: false,
    },
    emailSentToGuests: {
      type: Boolean,
      default: false,
    },
    replyEmailSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.ConsultancyBooking ||
  mongoose.model("ConsultancyBooking", ConsultancyBookingSchema);
