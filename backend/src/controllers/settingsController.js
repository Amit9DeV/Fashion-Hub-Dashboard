import connectToDatabase from "../config/db.js";
import Settings from "../models/Settings.js";

export const getSettings = async (req, res) => {
  try {
    await connectToDatabase();
    
    let settings = await Settings.findOne().lean();
    if (!settings) {
      settings = {
        storeName: "Fashion Hub",
        tagline: "Premium Men's Fashion",
        taxRate: 5,
        invoiceFooter: "Thank you for shopping with us!",
        printFormat: "A4",
        lowStockThreshold: 5,
      };
    } else {
      settings.printFormat = settings.printFormat || "A4";
      settings.lowStockThreshold = settings.lowStockThreshold || 5;
    }

    return res.json({ 
      success: true, 
      data: { settings } 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not fetch settings." });
  }
};

export const updateSettings = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await connectToDatabase();
    
    const { storeName, tagline, gstin, phone, address, upiId, taxRate, invoiceFooter, invoicePreferences, printFormat, lowStockThreshold } = req.body;

    const stringLimits = [[storeName, 120], [tagline, 200], [gstin, 30], [phone, 40], [address, 1000], [upiId, 120], [invoiceFooter, 500]];
    if (stringLimits.some(([value, max]) => value !== undefined && (typeof value !== "string" || value.length > max))) {
      return res.status(400).json({ success: false, message: "A store setting contains invalid text or exceeds its length limit." });
    }
    if (taxRate !== undefined && (typeof taxRate !== "number" || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100)) {
      return res.status(400).json({ success: false, message: "Tax rate must be a number from 0 to 100." });
    }
    if (printFormat !== undefined && !["A4", "THERMAL_80MM"].includes(printFormat)) {
      return res.status(400).json({ success: false, message: "Print format is invalid." });
    }
    if (lowStockThreshold !== undefined && (!Number.isSafeInteger(Number(lowStockThreshold)) || Number(lowStockThreshold) < 1 || Number(lowStockThreshold) > 100000)) {
      return res.status(400).json({ success: false, message: "Low-stock threshold must be a whole number from 1 to 100000." });
    }
    const preferenceKeys = ["showStoreContact", "showGstin", "showCustomerDetails", "showTaxBreakdown", "showVariantInfo", "showTrustBadges", "showPolicyText"];
    if (invoicePreferences !== undefined && (!invoicePreferences || typeof invoicePreferences !== "object" || Array.isArray(invoicePreferences) || Object.entries(invoicePreferences).some(([key, value]) => !preferenceKeys.includes(key) || typeof value !== "boolean"))) {
      return res.status(400).json({ success: false, message: "Invoice preferences are invalid." });
    }
    
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({ storeName, tagline, gstin, phone, address, upiId, taxRate, invoiceFooter, invoicePreferences, printFormat, lowStockThreshold });
    } else {
      if (storeName !== undefined) settings.storeName = storeName;
      if (tagline !== undefined) settings.tagline = tagline;
      if (gstin !== undefined) settings.gstin = gstin;
      if (phone !== undefined) settings.phone = phone;
      if (address !== undefined) settings.address = address;
      if (upiId !== undefined) settings.upiId = upiId;
      if (taxRate !== undefined) settings.taxRate = taxRate;
      if (invoiceFooter !== undefined) settings.invoiceFooter = invoiceFooter;
      if (printFormat !== undefined && ["A4", "THERMAL_80MM"].includes(printFormat)) settings.printFormat = printFormat;
      if (lowStockThreshold !== undefined) settings.lowStockThreshold = Math.max(1, parseInt(lowStockThreshold, 10) || 5);
      if (invoicePreferences) {
        settings.invoicePreferences = {
          ...settings.invoicePreferences,
          ...invoicePreferences
        };
      }
    }
    await settings.save();

    return res.json({ 
      success: true, 
      data: { settings } 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not update settings." });
  }
};
