import connectToDatabase from "../config/db.js";
import Customer from "../models/Customer.js";
import Order from "../models/Order.js";
import AuditLog from "../models/AuditLog.js";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// @route   GET /api/customers
// @desc    Search customers (POS typeahead)
// @access  Private
export const searchCustomers = async (req, res) => {
  try {
    const query = req.query.query?.trim().slice(0, 80) || "";
    await connectToDatabase();
    const search = new RegExp(escapeRegExp(query), "i");
    const customers = await Customer.find(
      query ? { $or: [{ name: search }, { mobile: search }, { whatsappNumber: search }] } : {}
    )
      .sort({ "stats.lastPurchaseAt": -1 })
      .limit(10)
      .lean();

    return res.json({
      success: true,
      data: {
        customers: customers.map((c) => ({ ...c, _id: c._id.toString() })),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not search customers." });
  }
};

// @route   GET /api/customers/all
// @desc    Get all customers with optional search and pagination
// @access  Private
export const getAllCustomers = async (req, res) => {
  try {
    await connectToDatabase();
    const query = req.query.query?.trim().slice(0, 80) || "";
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 100);
    const skip = (page - 1) * limit;
    const search = query ? new RegExp(escapeRegExp(query), "i") : null;

    let filter = {};
    if (search) {
      filter.$or = [{ name: search }, { mobile: search }, { whatsappNumber: search }];
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Customer.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        customers,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not fetch customers." });
  }
};

// @route   GET /api/customers/:id
// @desc    Get a single customer with their order history
// @access  Private
export const getCustomerById = async (req, res) => {
  try {
    await connectToDatabase();
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer)
      return res.status(404).json({ success: false, message: "Customer not found" });

    const orders = await Order.find({ customerId: req.params.id })
      .sort({ completedAt: -1 })
      .lean() || [];

    return res.json({ success: true, data: { customer, orders } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not fetch customer." });
  }
};

// @route   POST /api/customers
// @desc    Create a new customer
// @access  Private
export const createCustomer = async (req, res) => {
  try {
    await connectToDatabase();
    const { name, mobile, whatsappNumber, email, gstin, address } = req.body;

    if (!name && !mobile) {
      return res.status(400).json({ success: false, message: "Name or mobile number is required." });
    }

    // Check for duplicate mobile
    if (mobile) {
      const existing = await Customer.findOne({ mobile });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "A customer with this mobile number already exists.",
          data: { customer: existing },
        });
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
      address: typeof address === "object" ? address : address ? { line1: address } : undefined,
      createdBy: req.user?.id,
    });

    return res
      .status(201)
      .json({ success: true, data: { customer }, message: "Customer created successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not create customer." });
  }
};

// @route   PUT /api/customers/:id
// @desc    Update a customer
// @access  Private
export const updateCustomer = async (req, res) => {
  try {
    const { name, mobile, whatsappNumber, email, gstin, address } = req.body;
    await connectToDatabase();

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (mobile !== undefined) updates.mobile = mobile;
    if (whatsappNumber !== undefined) updates.whatsappNumber = whatsappNumber;
    if (email !== undefined) updates.email = email;
    if (gstin !== undefined) updates.gstin = gstin;
    if (address !== undefined) {
      updates.address = typeof address === "object" ? address : { line1: address };
    }

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

// @route   DELETE /api/customers/:id
// @desc    Delete a customer (ADMIN/MANAGER only)
// @access  Private
export const deleteCustomer = async (req, res) => {
  try {
    // ── Role guard (was missing — anyone could delete customers) ─────────────
    if (req.user.role !== "ADMIN" && req.user.role !== "MANAGER") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await connectToDatabase();
    const existing = await Customer.findById(req.params.id);
    if (!existing)
      return res.status(404).json({ success: false, message: "Customer not found" });

    if (existing.stats?.totalDuesPaisa > 0 && req.query.force !== "true") {
      return res.status(400).json({
        success: false,
        message: `Customer has outstanding balance of ₹${(existing.stats.totalDuesPaisa / 100).toFixed(2)}. Please settle dues first or confirm deletion.`,
      });
    }

    const customer = await Customer.findByIdAndDelete(req.params.id);

    // Nullify customerId on historical orders (preserve ledger, remove dangling ref)
    await Order.updateMany({ customerId: req.params.id }, { $unset: { customerId: "" } });

    return res.json({ success: true, message: "Customer deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not delete customer." });
  }
};

// @route   POST /api/customers/:id/dues/settle
// @desc    Record dues payment for a customer and allocate across unpaid/partial orders
// @access  Private
export const settleCustomerDues = async (req, res) => {
  try {
    const { id } = req.params;
    const { amountPaisa, method = "CASH", notes = "" } = req.body;

    const parsedAmount = parseInt(amountPaisa, 10);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid positive payment amount in paisa is required." });
    }

    await connectToDatabase();
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }

    const currentDues = customer.stats?.totalDuesPaisa || 0;
    const newDues = Math.max(0, currentDues - parsedAmount);

    let remainingToAllocate = parsedAmount;
    // Find customer orders with duePaisa > 0, oldest first
    const dueOrders = await Order.find({ customerId: id, duePaisa: { $gt: 0 } }).sort({ completedAt: 1 });

    const updatedOrders = [];
    for (const order of dueOrders) {
      if (remainingToAllocate <= 0) break;
      const allocate = Math.min(order.duePaisa, remainingToAllocate);
      order.duePaisa = Math.max(0, order.duePaisa - allocate);
      order.payments = order.payments || [];
      order.payments.push({
        method: ["CASH", "UPI", "CARD", "OTHER"].includes(method) ? method : "CASH",
        amountPaisa: allocate,
        reference: notes ? `Dues Settlement: ${notes}` : "Dues Settlement",
        paidAt: new Date(),
      });
      order.paymentStatus = order.duePaisa === 0 ? "PAID" : "PARTIAL";
      await order.save();
      updatedOrders.push(order);
      remainingToAllocate -= allocate;
    }

    customer.stats = customer.stats || {};
    customer.stats.totalDuesPaisa = newDues;
    await customer.save();

    await AuditLog.create({
      action: "CUSTOMER_DUES_SETTLED",
      entityType: "CUSTOMER",
      entityId: customer._id,
      actor: { id: req.user?.id, name: req.user?.name, role: req.user?.role },
      metadata: {
        amountPaisa: parsedAmount,
        method,
        notes,
        previousDues: currentDues,
        remainingDues: newDues,
        ordersSettledCount: updatedOrders.length,
      },
      occurredAt: new Date(),
    });

    return res.json({
      success: true,
      message: `Dues payment of ₹${(parsedAmount / 100).toFixed(2)} recorded successfully.`,
      data: { customer, settledPaisa: parsedAmount, remainingDuesPaisa: newDues },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Could not record dues payment." });
  }
};
