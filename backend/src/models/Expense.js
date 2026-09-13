import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    amountPaisa: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: ["STOCK", "RENT", "ELECTRICITY", "CASUAL", "PERSONAL", "OTHER"],
      required: true,
      default: "OTHER"
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI", "CARD", "OTHER"],
      required: true,
      default: "CASH"
    },
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export default mongoose.models.Expense || mongoose.model("Expense", expenseSchema);
