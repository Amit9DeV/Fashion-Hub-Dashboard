import mongoose from "mongoose";

const productVariantSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    barcode: { type: String, trim: true, sparse: true, unique: true },
    color: { type: String, trim: true },
    size: { type: String, trim: true, uppercase: true },
    costPricePaisa: { type: Number, min: 0, default: 0 },
    sellingPricePaisa: { type: Number, required: true, min: 0 },
    mrpPaisa: { type: Number, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    reorderLevel: { type: Number, min: 0, default: 2 },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
  },
  { timestamps: true }
);

productVariantSchema.index({ sku: "text", barcode: "text", color: "text" });

export default mongoose.models.ProductVariant || mongoose.model("ProductVariant", productVariantSchema);
