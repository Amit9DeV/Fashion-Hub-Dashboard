import connectToDatabase, { assertTransactionSupport } from "../config/db.js";
import Customer from "../models/Customer.js";
import Order from "../models/Order.js";
import AuditLog from "../models/AuditLog.js";
import CustomerPayment from "../models/CustomerPayment.js";
import mongoose from "mongoose";
import { createHash } from "node:crypto";

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
      query ? { active: { $ne: false }, $or: [{ name: search }, { mobile: search }, { whatsappNumber: search }] } : { active: { $ne: false } }
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

    let filter = { active: { $ne: false } };
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
    const customer = await Customer.findOne({ _id: req.params.id, active: { $ne: false } }).lean();
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
      const existing = await Customer.findOne({ mobile, active: { $ne: false } });
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

    if (existing.stats?.totalDuesPaisa > 0) {
      return res.status(400).json({
        success: false,
        message: `Customer has outstanding balance of ₹${(existing.stats.totalDuesPaisa / 100).toFixed(2)}. Settle dues before archiving.`,
      });
    }

    await Customer.updateOne({ _id: req.params.id }, {
      $set: { active: false, "consents.billingWhatsApp": false, "consents.marketingWhatsApp": false },
      $unset: { mobile: "", whatsappNumber: "", email: "", gstin: "", address: "" },
    });

    return res.json({ success: true, message: "Customer archived and contact details removed. Historical sales records were preserved." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not delete customer." });
  }
};

// @route   POST /api/customers/:id/dues/settle
// @desc    Record dues payment for a customer and allocate across unpaid/partial orders
// @access  Private
export const settleCustomerDues = async (req, res) => {
  let session;
  try {
    const { id } = req.params;
    const { amountPaisa, method = "CASH", notes = "", idempotencyKey } = req.body || {};
    if (!mongoose.isValidObjectId(id) || !Number.isSafeInteger(amountPaisa) || amountPaisa <= 0 || amountPaisa > 100000000000) {
      return res.status(400).json({ success: false, message: "A valid customer and positive payment amount in paisa are required." });
    }
    if (!["CASH", "UPI", "CARD", "OTHER"].includes(method)) {
      return res.status(400).json({ success: false, message: "Payment method is invalid." });
    }
    if (typeof notes !== "string" || notes.length > 500) return res.status(400).json({ success: false, message: "Reference must be 500 characters or fewer." });
    if (typeof idempotencyKey !== "string" || idempotencyKey.trim().length < 10 || idempotencyKey.length > 100) {
      return res.status(400).json({ success: false, message: "A valid payment idempotency key is required." });
    }
    const requestHash = createHash("sha256").update(JSON.stringify({ customerId: id, amountPaisa, method, notes })).digest("hex");

    await connectToDatabase();
    assertTransactionSupport();
    const priorPayment = await CustomerPayment.findOne({ idempotencyKey }).lean();
    if (priorPayment) {
      if (priorPayment.requestHash !== requestHash) return res.status(409).json({ success: false, message: "This idempotency key was already used for a different payment." });
      return res.json({ success: true, data: priorPayment, message: "Payment was already recorded." });
    }

    session = await mongoose.startSession();
    let payment;
    let remainingDuesPaisa;
    await session.withTransaction(async () => {
      const customer = await Customer.findById(id).session(session);
      if (!customer) {
        const error = new Error("Customer not found."); error.status = 404; throw error;
      }
      const currentDues = customer.stats?.totalDuesPaisa || 0;
      if (amountPaisa > currentDues) {
        const error = new Error("Payment cannot exceed the customer's current outstanding balance."); error.status = 409; throw error;
      }

      let remainingToAllocate = amountPaisa;
      const dueOrders = await Order.find({ customerId: id, duePaisa: { $gt: 0 } }).sort({ completedAt: 1 }).session(session);
      const allocations = [];
      const paidAt = new Date();
      for (const order of dueOrders) {
        if (remainingToAllocate <= 0) break;
        const allocated = Math.min(order.duePaisa, remainingToAllocate);
        order.duePaisa -= allocated;
        order.payments.push({ method, amountPaisa: allocated, reference: notes || "Customer dues settlement", paidAt });
        order.paymentStatus = order.duePaisa === 0 ? "PAID" : "PARTIAL";
        await order.save({ session });
        allocations.push({ orderId: order._id, amountPaisa: allocated });
        remainingToAllocate -= allocated;
      }
      if (remainingToAllocate !== 0) {
        const error = new Error("Customer balance does not match the outstanding order balances. Reconcile the account before recording payment.");
        error.status = 409; throw error;
      }

      customer.stats.totalDuesPaisa = currentDues - amountPaisa;
      await customer.save({ session });
      [payment] = await CustomerPayment.create([{
        customerId: customer._id,
        amountPaisa,
        method,
        reference: notes,
        allocations,
        idempotencyKey,
        requestHash,
        receivedBy: { id: req.user.id, name: req.user.name, role: req.user.role },
        receivedAt: paidAt,
      }], { session });
      remainingDuesPaisa = customer.stats.totalDuesPaisa;
      await AuditLog.create([{
        action: "CUSTOMER_DUES_SETTLED",
        entityType: "CUSTOMER",
        entityId: customer._id,
        actor: { id: req.user.id, name: req.user.name, role: req.user.role },
        metadata: { amountPaisa, method, notes, previousDues: currentDues, remainingDues: remainingDuesPaisa, ordersSettledCount: allocations.length, paymentId: payment._id },
        occurredAt: paidAt,
      }], { session });
    }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });

    return res.json({
      success: true,
      message: `Dues payment of ₹${(amountPaisa / 100).toFixed(2)} recorded successfully.`,
      data: { payment, settledPaisa: amountPaisa, remainingDuesPaisa },
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000 && req.body?.idempotencyKey) {
      const prior = await CustomerPayment.findOne({ idempotencyKey: req.body.idempotencyKey }).lean();
      if (prior && prior.requestHash === createHash("sha256").update(JSON.stringify({
        customerId: req.params.id,
        amountPaisa: req.body.amountPaisa,
        method: req.body.method || "CASH",
        notes: req.body.notes || "",
      })).digest("hex")) {
        return res.json({ success: true, data: prior, message: "Payment was already recorded." });
      }
    }
    return res.status(error.status || (error.code === 11000 ? 409 : 500)).json({ success: false, message: error.message || "Could not record dues payment." });
  } finally {
    if (session) await session.endSession();
  }
};
