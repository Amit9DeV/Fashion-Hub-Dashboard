import bcrypt from "bcryptjs";
import connectToDatabase from "../config/db.js";
import User from "../models/User.js";

export const getStaff = async (req, res) => {
  try {
    if (req.user?.role !== "ADMIN") {
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

export const createStaff = async (req, res) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { name, email, password, role = "CASHIER", phone } = req.body;
    if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !email.trim() || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required." });
    }
    if (name.trim().length > 100 || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: "Enter a valid name and email address." });
    }
    if (typeof password !== "string" || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({ success: false, message: "Password must be at least 12 characters and no more than 72 UTF-8 bytes." });
    }

    const safeRole = typeof role === "string" ? role.toUpperCase() : "CASHIER";
    if (!["ADMIN", "MANAGER", "CASHIER"].includes(safeRole)) {
      return res.status(400).json({ success: false, message: "Role must be ADMIN, MANAGER, or CASHIER." });
    }

    await connectToDatabase();
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: "A user with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const employeeId = `EMP-${Date.now().toString(36).toUpperCase()}`;

    const newStaff = await User.create({
      employeeId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: safeRole,
      phone: phone?.trim(),
      active: true,
    });

    const staffObj = newStaff.toObject();
    delete staffObj.passwordHash;

    return res.status(201).json({
      success: true,
      data: { staff: staffObj },
      message: "Staff member created successfully."
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not create staff member." });
  }
};

export const updateStaff = async (req, res) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;
    const { name, role, phone, active } = req.body;

    await connectToDatabase();
    const updates = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
        return res.status(400).json({ success: false, message: "Name must contain 1–100 characters." });
      }
      updates.name = name.trim();
    }
    if (role !== undefined) {
      if (typeof role !== "string" || !["ADMIN", "MANAGER", "CASHIER"].includes(role.toUpperCase())) {
        return res.status(400).json({ success: false, message: "Role must be ADMIN, MANAGER, or CASHIER." });
      }
      updates.role = role.toUpperCase();
    }
    if (phone !== undefined) {
      if (typeof phone !== "string" || phone.length > 30) return res.status(400).json({ success: false, message: "Phone must be a string of at most 30 characters." });
      updates.phone = phone.trim();
    }
    if (active !== undefined) {
      if (typeof active !== "boolean") return res.status(400).json({ success: false, message: "Active must be a boolean." });
      updates.active = active;
    }
    const shouldRevokeSessions = role !== undefined || active !== undefined;
    const current = await User.findById(id).select("role active").lean();
    if (!current) return res.status(404).json({ success: false, message: "Staff member not found." });
    const wouldRemainActiveAdmin = (updates.role ?? current.role) === "ADMIN" && (updates.active ?? current.active);
    if (current.role === "ADMIN" && current.active && !wouldRemainActiveAdmin) {
      const otherActiveAdmins = await User.countDocuments({ _id: { $ne: id }, role: "ADMIN", active: true });
      if (!otherActiveAdmins) return res.status(409).json({ success: false, message: "At least one active admin account must remain." });
    }
    const update = { $set: updates };
    if (shouldRevokeSessions) update.$inc = { sessionVersion: 1 };

    const updated = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
    if (!updated) {
      return res.status(404).json({ success: false, message: "Staff member not found." });
    }

    return res.json({
      success: true,
      data: { staff: updated },
      message: "Staff member updated successfully."
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not update staff member." });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.params;

    // Prevent deleting the currently logged-in admin
    if (req.user.id?.toString() === id) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account." });
    }

    await connectToDatabase();
    const target = await User.findById(id).select("role active").lean();
    if (!target) {
      return res.status(404).json({ success: false, message: "Staff member not found." });
    }
    if (target.role === "ADMIN" && target.active) {
      const otherActiveAdmins = await User.countDocuments({ _id: { $ne: id }, role: "ADMIN", active: true });
      if (!otherActiveAdmins) return res.status(409).json({ success: false, message: "At least one active admin account must remain." });
    }
    const deleted = await User.findByIdAndUpdate(id, { $set: { active: false }, $inc: { sessionVersion: 1 } }, { new: true }).lean();
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Staff member not found." });
    }

    return res.json({
      success: true,
      message: "Staff member deleted successfully."
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not delete staff member." });
  }
};
