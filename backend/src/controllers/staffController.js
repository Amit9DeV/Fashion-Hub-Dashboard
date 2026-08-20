import connectToDatabase from "../config/db.js";
import User from "../models/User.js";

export const getStaff = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await connectToDatabase();
    const staff = await User.find({}).sort({ createdAt: -1 }).lean();

    return res.json({ 
      success: true, 
      data: { staff } 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not fetch staff." });
  }
};
