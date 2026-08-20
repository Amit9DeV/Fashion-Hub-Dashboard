import connectToDatabase from "../config/db.js";
import Customer from "../models/Customer.js";
import Order from "../models/Order.js";

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
    const customers = await Customer.find({}).sort({ createdAt: -1 }).lean();
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
    
    const orders = await Order.find({ "customerSnapshot.customerId": req.params.id }).sort({ completedAt: -1 }).lean() || [];
    
    return res.json({ success: true, data: { customer, orders } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not fetch customer." });
  }
};
