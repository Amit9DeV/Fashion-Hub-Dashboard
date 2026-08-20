import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null }, // Null means it's a top-level category
    gender: { type: String, enum: ["MEN", "WOMEN", "UNISEX", "OTHER"], default: "MEN" },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" }
  },
  { timestamps: true }
);

// A category name should be unique within its parent. E.g., "Formal Shirts" under "Shirts".
categorySchema.index({ name: 1, parentCategory: 1 }, { unique: true });

export default mongoose.models.Category || mongoose.model("Category", categorySchema);
