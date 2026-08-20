import mongoose from "mongoose";

const inventoryMovementSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    skuSnapshot: { type: String, required: true },
    productNameSnapshot: { type: String, required: true },
    type: { type: String, enum: ["SALE", "PURCHASE", "RETURN", "EXCHANGE", "MANUAL_ADJUSTMENT", "DAMAGE", "STOCK_TRANSFER"], required: true },
    quantityDelta: { type: Number, required: true },
    referenceType: { type: String, required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true },
    performedBy: { id: String, name: String },
    occurredAt: { type: Date, required: true },
  },
  { timestamps: true }
);

inventoryMovementSchema.index({ variantId: 1, occurredAt: -1 });
inventoryMovementSchema.index({ referenceId: 1 });
inventoryMovementSchema.pre("save", function () {
  if (!this.isNew) throw new Error("Inventory movements are append-only.");
});

export default mongoose.models.InventoryMovement || mongoose.model("InventoryMovement", inventoryMovementSchema);
