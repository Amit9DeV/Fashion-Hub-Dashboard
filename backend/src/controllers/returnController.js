import mongoose from "mongoose";
import connectToDatabase from "../config/db.js";
import Return from "../models/Return.js";
import Order from "../models/Order.js";
import crypto from "crypto";
import ProductVariant from "../models/ProductVariant.js";
import InventoryMovement from "../models/InventoryMovement.js";
import { completeSale } from "../services/sales/completeSale.js";

// @desc    Core return logic (shared between processReturn and processExchange)
// @access  Internal
export const executeReturn = async (input, user) => {
  await connectToDatabase();

  const isStandalone = !process.env.MONGODB_URI?.includes("replicaSet");
  let session = await mongoose.startSession();
  let result;

  try {
    if (isStandalone) {
      session.endSession();
      session = undefined;
    }

    const runBlock = isStandalone
      ? (cb) => cb()
      : (cb, opts) => session.withTransaction(cb, opts);

    await runBlock(async () => {
      const { orderId, reason, items } = input;

      if (!orderId || !items || !items.length) {
        throw new Error("Order ID and returned items are required");
      }

      const order = await Order.findById(orderId).session(session);
      if (!order) {
        throw new Error("Order not found");
      }

      // Fetch all previous returns for this order to enforce partial-return limits
      const previousReturns = await Return.find({ orderId: order._id })
        .session(session)
        .lean();

      // Build a map: variantId → total previously returned quantity
      const alreadyReturnedQty = {};
      for (const ret of previousReturns) {
        for (const ri of ret.items) {
          const key = ri.variantId.toString();
          alreadyReturnedQty[key] = (alreadyReturnedQty[key] || 0) + ri.quantity;
        }
      }

      let totalRefundPaisa = 0;
      const returnItems = [];

      for (const returnReq of items) {
        const orderItem = order.items.find(
          (i) => i.variantId.toString() === returnReq.variantId
        );
        if (!orderItem) {
          throw new Error(`Variant ${returnReq.variantId} was not part of this order`);
        }

        const prevReturned = alreadyReturnedQty[returnReq.variantId] || 0;
        const remainingReturnable = orderItem.quantity - prevReturned;

        if (returnReq.quantity > remainingReturnable) {
          throw new Error(
            `Cannot return ${returnReq.quantity} unit(s) of ${orderItem.sku}. ` +
            `${remainingReturnable} unit(s) available to return (${prevReturned} already returned).`
          );
        }

        // Proportional unit refund
        const unitRefundPaisa = Math.floor(orderItem.totalPaisa / orderItem.quantity);
        const refundPaisa = unitRefundPaisa * returnReq.quantity;

        returnItems.push({
          productId: orderItem.productId,
          variantId: orderItem.variantId,
          productName: orderItem.productName,
          sku: orderItem.sku,
          color: orderItem.color,
          size: orderItem.size,
          quantity: returnReq.quantity,
          refundPaisa,
        });

        totalRefundPaisa += refundPaisa;

        // Restock the product variant
        await ProductVariant.findByIdAndUpdate(
          orderItem.variantId,
          { $inc: { stock: returnReq.quantity } },
          { session }
        );

        // Log inventory movement
        await InventoryMovement.create(
          [{
            productId: orderItem.productId,
            variantId: orderItem.variantId,
            skuSnapshot: orderItem.sku,
            productNameSnapshot: orderItem.productName,
            type: "RETURN",
            quantityDelta: returnReq.quantity,
            referenceType: "Order",
            referenceId: order._id,
            reason: `Return from Order ${order.invoiceNumber}`,
            performedBy: { id: user.id, name: user.name || "Staff" },
            occurredAt: new Date(),
          }],
          { session }
        );
      }

      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
      const randomSuffix = crypto.randomBytes(2).toString("hex").toUpperCase();
      const returnNumber = `RTN-${dateStr}-${randomSuffix}`;

      const newReturn = new Return({
        returnNumber,
        orderId: order._id,
        invoiceNumber: order.invoiceNumber,
        customerId: order.customerId,
        customerSnapshot: order.customerSnapshot,
        items: returnItems,
        totalRefundPaisa,
        reason,
        staffSnapshot: { id: user.id, name: user.name, role: user.role },
      });

      await newReturn.save({ session });
      result = newReturn;
    }, {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    });
  } finally {
    if (session) await session.endSession();
  }
  return result;
};

// @route   POST /api/returns
// @access  Private
export const processReturn = async (req, res) => {
  try {
    const result = await executeReturn(req.body, req.user);
    return res.status(201).json({
      success: true,
      data: result,
      message: "Return processed successfully.",
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({
      success: false,
      message: error.message || "Could not process return.",
    });
  }
};

// @route   POST /api/returns/exchange
// @access  Private
export const processExchange = async (req, res) => {
  try {
    const { returnPayload, salePayload } = req.body;

    if (!returnPayload || !salePayload) {
      return res.status(400).json({
        success: false,
        message: "Both returnPayload and salePayload are required for an exchange.",
      });
    }

    const returnResult = await executeReturn(returnPayload, req.user);
    const refundCredit = returnResult.totalRefundPaisa;

    if (refundCredit > 0) {
      salePayload.payments = salePayload.payments || [];
      salePayload.payments.push({
        method: "OTHER",
        amountPaisa: refundCredit,
        reference: `Exchange Credit (RTN: ${returnResult.returnNumber})`,
      });
      salePayload.notes = `Exchange for Order ${returnPayload.orderId}. ` + (salePayload.notes || "");
    }

    const saleResult = await completeSale(salePayload, req.user);

    return res.status(201).json({
      success: true,
      message: "Exchange processed successfully.",
      data: { return: returnResult, sale: saleResult },
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({
      success: false,
      message: error.message || "Could not process exchange.",
    });
  }
};

// @route   GET /api/returns
// @desc    Get all returns (paginated)
// @access  Private
export const getReturns = async (req, res) => {
  try {
    await connectToDatabase();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    const [returns, total] = await Promise.all([
      Return.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Return.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        returns,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Could not fetch returns." });
  }
};

// @route   GET /api/returns/:id
// @access  Private
export const getReturnById = async (req, res) => {
  try {
    await connectToDatabase();
    const returnDoc = await Return.findById(req.params.id).lean();
    if (!returnDoc)
      return res.status(404).json({ success: false, message: "Return not found" });
    res.json({ success: true, data: returnDoc });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Could not fetch return." });
  }
};
