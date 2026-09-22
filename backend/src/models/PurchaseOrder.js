import mongoose from "mongoose";

const poItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant", required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    costPricePaisa: { type: Number, required: true, min: 0 },
    totalPaisa: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    supplierSnapshot: {
      name: String,
      gstin: String,
    },
    items: { type: [poItemSchema], required: true },
    totalAmountPaisa: { type: Number, required: true },
    status: { type: String, enum: ["DRAFT", "ORDERED", "RECEIVED", "CANCELLED"], default: "DRAFT" },
    expectedDeliveryDate: Date,
    receivedAt: Date,
    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.models.PurchaseOrder || mongoose.model("PurchaseOrder", purchaseOrderSchema);
