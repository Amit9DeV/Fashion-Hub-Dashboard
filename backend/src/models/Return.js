import mongoose from "mongoose";

const returnItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    color: String,
    size: String,
    quantity: { type: Number, required: true, min: 1 },
    refundPaisa: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const returnSchema = new mongoose.Schema(
  {
    returnNumber: { type: String, required: true, unique: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    invoiceNumber: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    customerSnapshot: {
      name: String,
      mobile: String,
    },
    items: { type: [returnItemSchema], required: true },
    totalRefundPaisa: { type: Number, required: true },
    cashRefundPaisa: { type: Number, min: 0 },
    exchangeCreditPaisa: { type: Number, min: 0, default: 0 },
    idempotencyKey: { type: String, trim: true, unique: true, sparse: true },
    requestHash: { type: String, minlength: 64, maxlength: 64 },
    reason: { type: String, trim: true },
    staffSnapshot: {
      id: { type: String },
      name: { type: String },
      role: { type: String },
    },
    storeSnapshot: { name: { type: String, default: "FASHION HUB" } },
  },
  { timestamps: true }
);

export default mongoose.models.Return || mongoose.model("Return", returnSchema);
