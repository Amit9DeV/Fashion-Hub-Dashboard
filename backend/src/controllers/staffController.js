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
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required." });
    }

    const safeRole = ["ADMIN", "MANAGER", "CASHIER"].includes(role?.toUpperCase())
      ? role.toUpperCase()
      : "CASHIER";

    await connectToDatabase();
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: "A user with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
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
    if (name !== undefined) updates.name = name.trim();
    if (role !== undefined) {
      updates.role = ["ADMIN", "MANAGER", "CASHIER"].includes(role?.toUpperCase())
        ? role.toUpperCase()
        : "CASHIER";
    }
    if (phone !== undefined) updates.phone = phone.trim();
    if (active !== undefined) updates.active = Boolean(active);

    const updated = await User.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
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
    const deleted = await User.findByIdAndDelete(id).lean();
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
