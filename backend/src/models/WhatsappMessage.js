import mongoose from "mongoose";

const whatsappMessageSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    type: { type: String, enum: ["INVOICE", "PAYMENT_CONFIRMATION", "RETURN_CONFIRMATION", "EXCHANGE_CONFIRMATION", "MARKETING"], required: true },
    category: { type: String, enum: ["TRANSACTIONAL", "MARKETING"], required: true },
    phoneNumber: { type: String, required: true },
    providerMessageId: String,
    status: { type: String, enum: ["QUEUED", "SENT", "DELIVERED", "READ", "FAILED"], default: "QUEUED" },
    templateName: String,
    lastError: String,
    queuedAt: Date,
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
  },
  { timestamps: true }
);

whatsappMessageSchema.index({ invoiceId: 1, createdAt: -1 });

export default mongoose.models.WhatsappMessage || mongoose.model("WhatsappMessage", whatsappMessageSchema);
