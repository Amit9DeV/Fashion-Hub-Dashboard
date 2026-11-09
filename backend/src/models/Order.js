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
    unitCostPaisa: { type: Number, required: true, min: 0, default: 0 },
    unitPricePaisa: { type: Number, required: true, min: 0 },
    grossPaisa: { type: Number, required: true, min: 0 },
    discountPaisa: { type: Number, required: true, min: 0 },
    taxablePaisa: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, required: true, min: 0 },
    taxPaisa: { type: Number, required: true, min: 0 },
    cgstPaisa: { type: Number, min: 0, default: 0 },
    sgstPaisa: { type: Number, min: 0, default: 0 },
    hsn: { type: String, trim: true },
    totalPaisa: { type: Number, required: true, min: 0 },
    totalItemCostPaisa: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    method: { type: String, enum: ["CASH", "UPI", "CARD", "OTHER"], required: true },
    amountPaisa: { type: Number, required: true, min: 0 },
    reference: String,
    paidAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    invoiceNumber: { type: String, required: true, unique: true },
    status: { 
      type: String, 
      enum: ["COMPLETED", "RETURNED", "EXCHANGED", "PARTIALLY_RETURNED", "CANCELLED"], 
      default: "COMPLETED" 
    },
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
    cgstPaisa: { type: Number, min: 0, default: 0 },
    sgstPaisa: { type: Number, min: 0, default: 0 },
    totalPaisa: { type: Number, required: true },
    duePaisa: { type: Number, default: 0 },
    payments: { type: [paymentSchema], required: true },
    paymentStatus: { type: String, enum: ["PAID", "PARTIAL", "UNPAID"], default: "PAID" },
    staffSnapshot: {
      id: { type: String },
      name: { type: String },
      role: { type: String },
    },
    idempotencyKey: { type: String, unique: true, sparse: true },
    idempotencyHash: { type: String, minlength: 64, maxlength: 64 },
    storeSnapshot: { name: { type: String, default: "FASHION HUB" } },
    notes: { type: String, trim: true },
    completedAt: { type: Date, required: true },
    isImmutable: { type: Boolean, default: false },
  },
  { timestamps: true }
);

orderSchema.index({ completedAt: -1 });
orderSchema.index({ "payments.method": 1, "payments.paidAt": 1 });

export default mongoose.models.Order || mongoose.model("Order", orderSchema);
