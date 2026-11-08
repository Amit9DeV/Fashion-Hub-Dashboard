import bcrypt from "bcryptjs";
import connectToDatabase from "../config/db.js";
import User from "../models/User.js";
import { createSession, clearSession } from "../middleware/auth.js";

export const login = async (req, res) => {
  try {
    const rawIdentifier = (req.body.email || req.body.username || req.body.employeeId || req.body.userId || "").trim();
    const { password } = req.body;
    if (!rawIdentifier || !password) {
      return res.status(400).json({ success: false, message: "Email or Staff ID and password are required." });
    }

    await connectToDatabase();
    const user = await User.findOne({
      $or: [
        { email: rawIdentifier.toLowerCase() },
        { employeeId: rawIdentifier.toUpperCase() },
        { employeeId: rawIdentifier },
      ],
    }).select("+passwordHash");
    
    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: "Invalid email/user ID or password." });
    }
    
    const token = createSession(res, user);
    
    return res.json({ 
      success: true, 
      data: { 
        id: user._id, 
        name: user.name, 
        role: user.role, 
        email: user.email,
        employeeId: user.employeeId,
        token,
      } 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Unable to sign in." });
  }
};

export const logout = async (req, res) => {
  try {
    clearSession(res);
    return res.json({ success: true, message: "Signed out successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error signing out" });
  }
};

export const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    return res.json({ success: true, data: req.user });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching user" });
  }
};

export const changePassword = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new passwords are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters." });
    }

    await connectToDatabase();
    const user = await User.findById(req.user.id).select("+passwordHash");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect." });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not change password." });
  }
};
