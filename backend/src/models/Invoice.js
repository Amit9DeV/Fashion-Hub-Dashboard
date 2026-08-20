import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    // High-entropy, unguessable token for the one invoice PDF link sent by WhatsApp.
    publicToken: { type: String, required: true, unique: true, index: true, select: false },
    snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    pdfStatus: { type: String, enum: ["PENDING", "READY", "FAILED"], default: "PENDING" },
    pdfPath: String,
    pdfGeneratedAt: Date,
    pdfError: String,
  },
  { timestamps: true }
);

export default mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);
