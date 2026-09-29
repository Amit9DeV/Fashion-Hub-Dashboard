import connectToDatabase from "../config/db.js";
import Customer from "../models/Customer.js";
import Order from "../models/Order.js";
import crypto from "crypto";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const searchCustomers = async (req, res) => {
  try {
    const query = req.query.query?.trim().slice(0, 80) || "";
    await connectToDatabase();
    const search = new RegExp(escapeRegExp(query), "i");
    const customers = await Customer.find(query ? { $or: [{ name: search }, { mobile: search }, { whatsappNumber: search }] } : {})
      .sort({ "stats.lastPurchaseAt": -1 })
      .limit(10)
      .lean();
      
    return res.json({ 
      success: true, 
      data: { 
        customers: customers.map((customer) => ({
          ...customer,
          _id: customer._id.toString(),
        })) 
      } 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not search customers." });
  }
};

export const getAllCustomers = async (req, res) => {
  try {
    await connectToDatabase();
    const query = req.query.query?.trim().slice(0, 80) || "";
    const search = query ? new RegExp(escapeRegExp(query), "i") : null;
    
    let filter = {};
    if (search) {
      filter.$or = [{ name: search }, { mobile: search }, { whatsappNumber: search }];
    }
    
    const customers = await Customer.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: { customers } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not fetch customers." });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    await connectToDatabase();
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
    
    // Order stores customerId at the root level, not inside customerSnapshot
    const orders = await Order.find({ customerId: req.params.id }).sort({ completedAt: -1 }).lean() || [];
    
    return res.json({ success: true, data: { customer, orders } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not fetch customer." });
  }
};

export const createCustomer = async (req, res) => {
  try {
    await connectToDatabase();
    const { name, mobile, whatsappNumber, email, gstin } = req.body;

    if (!name && !mobile) {
      return res.status(400).json({ success: false, message: "Name or mobile number is required." });
    }

    // Check for duplicate mobile
    if (mobile) {
      const existing = await Customer.findOne({ mobile });
      if (existing) {
        return res.status(409).json({ success: false, message: "A customer with this mobile number already exists.", data: { customer: existing } });
      }
    }

    const customerCode = `CUS-${Date.now().toString(36).toUpperCase()}`;
    const customer = await Customer.create({
      customerCode,
      name: name || "Walk-in customer",
      mobile: mobile || undefined,
      whatsappNumber: whatsappNumber || mobile || undefined,
      email: email || undefined,
      gstin: gstin || undefined,
      createdBy: req.user?.id,
    });

    return res.status(201).json({ success: true, data: { customer }, message: "Customer created successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not create customer." });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { name, mobile, email, gstin } = req.body;
    await connectToDatabase();

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (mobile !== undefined) updates.mobile = mobile;
    if (email !== undefined) updates.email = email;
    if (gstin !== undefined) updates.gstin = gstin;

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }

    return res.json({ success: true, data: { customer } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not update customer." });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    await connectToDatabase();
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
    
    // Also nullify the customerId in their past orders to prevent dangling references,
    // or just leave it since it's a historical ledger. We'll leave the snapshot but nullify the ID.
    await Order.updateMany(
      { customerId: req.params.id },
      { $unset: { customerId: "" } }
    );
    
    return res.json({ success: true, message: "Customer deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not delete customer." });
  }
};
