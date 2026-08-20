import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    productCode: { type: String, unique: true, sparse: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true, index: true },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
    brandSnapshot: { type: String, trim: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    categorySnapshot: { type: String, trim: true, index: true },
    subcategorySnapshot: { type: String, trim: true },
    description: { type: String, trim: true },
    gender: { type: String, enum: ["MEN", "WOMEN", "UNISEX", "OTHER"], default: "MEN" },
    material: { type: String, trim: true },
    images: [{ type: String }],
    taxRate: { type: Number, min: 0, max: 100, default: 5 },
    hsn: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    status: { type: String, enum: ["ACTIVE", "DRAFT", "ARCHIVED"], default: "ACTIVE" }
  },
  { timestamps: true }
);

productSchema.index({ name: "text", brandSnapshot: "text", categorySnapshot: "text" });

export default mongoose.models.Product || mongoose.model("Product", productSchema);
