import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    customerCode: { type: String, unique: true, sparse: true, trim: true },
    name: { type: String, trim: true, maxlength: 120 },
    mobile: { type: String, trim: true, unique: true, sparse: true },
    whatsappNumber: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    gstin: { type: String, trim: true, uppercase: true },
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
    },
    consents: {
      billingWhatsApp: { type: Boolean, default: false },
      marketingWhatsApp: { type: Boolean, default: false },
      marketingOptedOutAt: Date,
    },
    stats: {
      totalOrders: { type: Number, default: 0 },
      totalSpentPaisa: { type: Number, default: 0 },
      averageOrderValuePaisa: { type: Number, default: 0 },
      totalDuesPaisa: { type: Number, default: 0 },
      firstPurchaseAt: Date,
      lastPurchaseAt: Date,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

customerSchema.index({ whatsappNumber: 1 });

export default mongoose.models.Customer || mongoose.model("Customer", customerSchema);
