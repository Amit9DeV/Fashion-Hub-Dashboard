import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    employeeId: { type: String, trim: true, uppercase: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["ADMIN", "MANAGER", "CASHIER"], default: "CASHIER", required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
