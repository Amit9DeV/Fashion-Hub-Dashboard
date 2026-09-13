import connectToDatabase from "../config/db.js";
import Order from "../models/Order.js";
import Invoice from "../models/Invoice.js";
import WhatsappMessage from "../models/WhatsappMessage.js";

export const getOrders = async (req, res) => {
  try {
    await connectToDatabase();
    const orders = await Order.find().sort({ completedAt: -1 }).limit(50).lean();
    
    const invoiceIds = orders.map((order) => order._id);
    const invoices = await Invoice.find({ orderId: { $in: invoiceIds } }).lean();
    const messages = await WhatsappMessage.find({ orderId: { $in: invoiceIds }, type: "INVOICE" }).lean();
    
    return res.json({ 
      success: true, 
      data: { orders, invoices, messages } 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not fetch orders." });
  }
};

import ProductVariant from "../models/ProductVariant.js";

export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    await connectToDatabase();
    
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Restore stock
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        if (item.variantId) {
          await ProductVariant.findByIdAndUpdate(item.variantId, {
            $inc: { stock: item.quantity }
          });
        }
      }
    }

    // Revert customer stats
    if (order.customerId) {
      await import("../models/Customer.js").then(async ({ default: Customer }) => {
        await Customer.findByIdAndUpdate(order.customerId, {
          $inc: {
            "stats.totalOrders": -1,
            "stats.totalSpentPaisa": -(order.totalPaisa || 0)
          }
        });
      });
    }

    await Order.findByIdAndDelete(id);
    await Invoice.deleteMany({ orderId: id });
    await WhatsappMessage.deleteMany({ orderId: id });

    return res.json({ success: true, message: "Order deleted and stock restored." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not delete order." });
  }
};

import { updateSale } from "../services/sales/updateSale.js";

export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const result = await updateSale(id, req.body, user);
    
    return res.json({ 
      success: true, 
      data: result,
      message: "Order updated successfully."
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Could not update order." });
  }
};

import Customer from "../models/Customer.js";

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    await connectToDatabase();
    
    const order = await Order.findById(id).lean();
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Also get the customer details to populate in the frontend
    let customer = null;
    if (order.customerId) {
        customer = await Customer.findById(order.customerId).lean();
    }

    // Populate mrpPaisa for each item to show correct MRP in Edit mode
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        if (item.variantId) {
          const variant = await ProductVariant.findById(item.variantId).select('mrpPaisa').lean();
          if (variant && variant.mrpPaisa) {
            item.mrpPaisa = variant.mrpPaisa;
          }
        }
      }
    }
    
    return res.json({ success: true, data: { order, customer } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not fetch order." });
  }
};
