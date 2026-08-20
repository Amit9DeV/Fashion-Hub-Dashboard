import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    productName: { type: String, required: true },
    brand: String,
    category: String,
    sku: { type: String, required: true },
    barcode: String,
    color: String,
    size: String,
    quantity: { type: Number, required: true, min: 1 },
    unitPricePaisa: { type: Number, required: true, min: 0 },
    grossPaisa: { type: Number, required: true, min: 0 },
    discountPaisa: { type: Number, required: true, min: 0 },
    taxablePaisa: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, required: true, min: 0 },
    taxPaisa: { type: Number, required: true, min: 0 },
    totalPaisa: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    method: { type: String, enum: ["CASH", "UPI", "CARD", "OTHER"], required: true },
    amountPaisa: { type: Number, required: true, min: 0 },
    reference: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    invoiceNumber: { type: String, required: true, unique: true },
    status: { type: String, enum: ["COMPLETED"], default: "COMPLETED" },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    customerSnapshot: {
      name: String,
      mobile: String,
      whatsappNumber: String,
    },
    items: { type: [orderItemSchema], required: true },
    subtotalPaisa: { type: Number, required: true },
    discountPaisa: { type: Number, required: true },
    taxPaisa: { type: Number, required: true },
    totalPaisa: { type: Number, required: true },
    payments: { type: [paymentSchema], required: true },
    paymentStatus: { type: String, enum: ["PAID"], default: "PAID" },
    staffSnapshot: {
      id: { type: String },
      name: { type: String },
      role: { type: String },
    },
    idempotencyKey: { type: String, unique: true, sparse: true },
    storeSnapshot: { name: { type: String, default: "FASHION HUB" } },
    notes: { type: String, trim: true },
    completedAt: { type: Date, required: true },
    isImmutable: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model("Order", orderSchema);
