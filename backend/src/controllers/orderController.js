// All imports hoisted to top — ES modules require this
import connectToDatabase from "../config/db.js";
import Order from "../models/Order.js";
import Invoice from "../models/Invoice.js";
import WhatsappMessage from "../models/WhatsappMessage.js";
import ProductVariant from "../models/ProductVariant.js";
import Customer from "../models/Customer.js";
import { updateSale } from "../services/sales/updateSale.js";

// @route   GET /api/orders
// @desc    Get paginated completed orders with invoice & whatsapp status
// @access  Private
export const getOrders = async (req, res) => {
  try {
    await connectToDatabase();

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    const query = (req.query.query || req.query.q)?.trim().slice(0, 80) || "";
    let filter = {};
    if (query) {
      // Escape for regex
      const escapeRegExp = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const search = new RegExp(escapeRegExp(query), "i");
      filter.$or = [
        { invoiceNumber: search },
        { orderNumber: search },
        { "customerSnapshot.name": search },
        { "customerSnapshot.mobile": search },
        { "customerSnapshot.whatsappNumber": search },
      ];
    }

    if (req.query.startDate && req.query.endDate) {
      filter.completedAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate + "T23:59:59.999Z")
      };
    } else if (req.query.startDate) {
      filter.completedAt = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.completedAt = { $lte: new Date(req.query.endDate + "T23:59:59.999Z") };
    }

    if (req.query.paymentMethod && req.query.paymentMethod !== "ALL") {
      filter["payments.method"] = req.query.paymentMethod.toUpperCase();
    }

    if (req.query.status && req.query.status !== "ALL") {
      filter.status = req.query.status.toUpperCase();
    }

    if (req.query.dueStatus === "HAS_DUES") {
      filter.duePaisa = { $gt: 0 };
    } else if (req.query.dueStatus === "PAID") {
      filter.duePaisa = { $lte: 0 };
    }

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ completedAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(filter),
    ]);

    const invoiceIds = orders.map((order) => order._id);
    const [invoices, messages] = await Promise.all([
      Invoice.find({ orderId: { $in: invoiceIds } }).lean(),
      WhatsappMessage.find({ orderId: { $in: invoiceIds }, type: "INVOICE" }).lean(),
    ]);

    return res.json({
      success: true,
      data: {
        orders,
        invoices,
        messages,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not fetch orders." });
  }
};

// @route   DELETE /api/orders/:id
// @desc    Delete an order, restore stock, and revert customer stats
// @access  Private (ADMIN/MANAGER only)
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "ADMIN" && req.user.role !== "MANAGER") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await connectToDatabase();

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Restore stock for each variant
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        if (item.variantId) {
          await ProductVariant.findByIdAndUpdate(item.variantId, {
            $inc: { stock: item.quantity },
          });
        }
      }
    }

    // Revert customer lifetime stats (use statically imported Customer) with floor of 0
    if (order.customerId) {
      await Customer.findByIdAndUpdate(order.customerId, [
        {
          $set: {
            "stats.totalOrders": { $max: [0, { $subtract: [{ $ifNull: ["$stats.totalOrders", 0] }, 1] }] },
            "stats.totalSpentPaisa": { $max: [0, { $subtract: [{ $ifNull: ["$stats.totalSpentPaisa", 0] }, (order.totalPaisa || 0)] }] },
            "stats.totalDuesPaisa": { $max: [0, { $subtract: [{ $ifNull: ["$stats.totalDuesPaisa", 0] }, (order.duePaisa || 0)] }] },
          }
        }
      ]);
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

// @route   PUT /api/orders/:id
// @desc    Edit an existing completed order (via updateSale service)
// @access  Private
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const result = await updateSale(id, req.body, user);

    return res.json({
      success: true,
      data: result,
      message: "Order updated successfully.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Could not update order." });
  }
};

// @route   GET /api/orders/search
// @desc    Search orders by invoice number, order number, or ID
// @access  Private
export const searchOrders = async (req, res) => {
  try {
    const q = (req.query.q || "").trim().slice(0, 80);
    if (!q) {
      return res.status(400).json({ success: false, message: "Query parameter 'q' is required" });
    }
    
    await connectToDatabase();
    
    const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const search = new RegExp(escapeRegExp(q), "i");
    let query = {
      $or: [
        { invoiceNumber: search },
        { orderNumber: search },
        { "customerSnapshot.mobile": search },
        { "customerSnapshot.name": search },
        { "customerSnapshot.whatsappNumber": search },
      ]
    };
    
    // If it's a valid ObjectId, search by ID too
    if (q.match(/^[0-9a-fA-F]{24}$/)) {
      query.$or.push({ _id: q });
    }

    const orders = await Order.find(query).sort({ completedAt: -1 }).limit(10).lean();
    
    return res.json({ success: true, data: { orders } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Search failed" });
  }
};

// @route   GET /api/orders/:id
// @desc    Get a single order with customer details and variant MRP
// @access  Private
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    await connectToDatabase();

    const order = await Order.findById(id).lean();
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Fetch customer details for the edit form
    let customer = null;
    if (order.customerId) {
      customer = await Customer.findById(order.customerId).lean();
    }

    // Populate real-time MRP for each item so the edit form shows accurate values
    if (order.items && order.items.length > 0) {
      const variantIds = order.items.map(item => item.variantId).filter(Boolean);
      const variants = await ProductVariant.find({ _id: { $in: variantIds } })
        .select("mrpPaisa stock")
        .lean();
      
      const variantMap = new Map(variants.map(v => [v._id.toString(), v]));

      for (const item of order.items) {
        if (item.variantId) {
          const variant = variantMap.get(item.variantId.toString());
          if (variant) {
            if (variant.mrpPaisa) item.mrpPaisa = variant.mrpPaisa;
            // Pass real stock so POS edit mode can cap quantity correctly
            item.currentStock = variant.stock;
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
