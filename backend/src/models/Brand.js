import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    logoUrl: { type: String, trim: true },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" }
  },
  { timestamps: true }
);

export default mongoose.models.Brand || mongoose.model("Brand", brandSchema);
