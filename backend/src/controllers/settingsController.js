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
        invoiceFooter: "Thank you for shopping with us!"
      };
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
    
    const { storeName, tagline, taxRate, invoiceFooter, invoicePreferences } = req.body;
    
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({ storeName, tagline, taxRate, invoiceFooter, invoicePreferences });
    } else {
      settings.storeName = storeName;
      settings.tagline = tagline;
      settings.taxRate = taxRate;
      settings.invoiceFooter = invoiceFooter;
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
