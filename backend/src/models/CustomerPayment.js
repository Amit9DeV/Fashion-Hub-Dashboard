import mongoose from "mongoose";

const allocationSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  amountPaisa: { type: Number, required: true, min: 1 },
}, { _id: false });

const customerPaymentSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
  amountPaisa: { type: Number, required: true, min: 1 },
  method: { type: String, enum: ["CASH", "UPI", "CARD", "OTHER"], required: true },
  reference: { type: String, trim: true, maxlength: 500 },
  allocations: { type: [allocationSchema], required: true },
  idempotencyKey: { type: String, required: true, unique: true, minlength: 10, maxlength: 100 },
  requestHash: { type: String, required: true, minlength: 64, maxlength: 64 },
  receivedBy: { id: String, name: String, role: String },
  receivedAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true });

export default mongoose.models.CustomerPayment || mongoose.model("CustomerPayment", customerPaymentSchema);
