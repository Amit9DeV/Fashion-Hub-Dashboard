import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    storeName: { type: String, required: true, default: "Fashion Hub" },
    tagline: { type: String, default: "Premium Men's Fashion" },
    taxRate: { type: Number, default: 5 },
    invoiceFooter: { type: String, default: "Thank you for shopping with us!" },
    currency: { type: String, default: "INR" },
    invoicePreferences: {
      showStoreContact: { type: Boolean, default: true },
      showGstin: { type: Boolean, default: true },
      showCustomerDetails: { type: Boolean, default: true },
      showTaxBreakdown: { type: Boolean, default: true },
      showVariantInfo: { type: Boolean, default: true },
      showTrustBadges: { type: Boolean, default: true },
      showPolicyText: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

export default mongoose.models.Settings || mongoose.model("Settings", settingsSchema);
