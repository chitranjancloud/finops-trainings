import mongoose from "mongoose";

const WebinarSchema = new mongoose.Schema({
  name: String,
  email: String,
  whatsapp: String,
  userId: String,
  webinarId: String,
  webinarTitle: String,
  price: String,
  paidAmount: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    default: 0
  },
  paymentId: String,
  date: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.Webinar || mongoose.model("Webinar", WebinarSchema);
