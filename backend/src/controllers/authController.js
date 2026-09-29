import bcrypt from "bcryptjs";
import connectToDatabase from "../config/db.js";
import User from "../models/User.js";
import { createSession, clearSession } from "../middleware/auth.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    await connectToDatabase();
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+passwordHash");
    
    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
    
    const token = createSession(res, user);
    
    return res.json({ 
      success: true, 
      data: { 
        id: user._id, 
        name: user.name, 
        role: user.role, 
        email: user.email,
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
