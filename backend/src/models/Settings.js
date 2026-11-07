import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    storeName: { type: String, required: true, default: "Fashion Hub" },
    tagline: { type: String, default: "Premium Men's Fashion" },
    gstin: { type: String, trim: true },
    phone: { type: String, default: "+91 82923 99080" },
    address: { type: String, default: "Main Road Mairwa, Near Nahar Bridge, South of HDFC Bank, Mairwa - 841437" },
    upiId: { type: String, default: "" },
    taxRate: { type: Number, default: 5 },
    invoiceFooter: { type: String, default: "Thank you for shopping with us!" },
    printFormat: { type: String, enum: ["A4", "THERMAL_80MM"], default: "A4" },
    lowStockThreshold: { type: Number, default: 5 },
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
