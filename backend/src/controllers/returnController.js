import mongoose from "mongoose";
import connectToDatabase, { assertTransactionSupport } from "../config/db.js";
import Return from "../models/Return.js";
import Order from "../models/Order.js";
import { createHash, randomBytes } from "node:crypto";
import ProductVariant from "../models/ProductVariant.js";
import InventoryMovement from "../models/InventoryMovement.js";
import Customer from "../models/Customer.js";
import { completeSale, saleInputSchema } from "../services/sales/completeSale.js";

// @desc    Core return logic (shared between processReturn and processExchange)
// @access  Internal
export const executeReturn = async (input, user, { session: externalSession } = {}) => {
  await connectToDatabase();
  assertTransactionSupport();

  const invalid = (message) => {
    const error = new Error(message);
    error.status = 400;
    return error;
  };
  if (!mongoose.isValidObjectId(input?.orderId)) throw invalid("A valid order is required to process this return.");
  if (typeof input?.idempotencyKey !== "string" || input.idempotencyKey.trim().length < 10 || input.idempotencyKey.length > 100) {
    throw invalid("A valid idempotency key is required to process this return.");
  }
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 100) {
    throw invalid("Select between 1 and 100 return lines.");
  }
  if (input.items.some((item) => !mongoose.isValidObjectId(item?.variantId) || !Number.isSafeInteger(item?.quantity) || item.quantity < 1 || item.quantity > 99)) {
    throw invalid("Each return line needs a valid variant and a whole quantity from 1 to 99.");
  }
  if (new Set(input.items.map((item) => item.variantId.toString())).size !== input.items.length) {
    throw invalid("A variant can appear only once in a return request.");
  }
  const requestHash = createHash("sha256")
    .update(JSON.stringify({ ...input, idempotencyKey: undefined }))
    .digest("hex");

  if (input.idempotencyKey) {
    const existingReturn = await Return.findOne({ idempotencyKey: input.idempotencyKey });
    if (existingReturn) {
      if (existingReturn.requestHash && existingReturn.requestHash !== requestHash) {
        const error = new Error("This idempotency key was already used for a different return.");
        error.status = 409;
        throw error;
      }
      return existingReturn;
    }
  }

  const ownsSession = !externalSession;
  const session = externalSession || await mongoose.startSession();
  let result;

  try {
    const execute = async () => {
      const { orderId, reason, items } = input;

      if (!orderId || !items || !items.length) {
        throw new Error("Order ID and returned items are required");
      }

      const order = await Order.findById(orderId).session(session);
      if (!order) {
        throw new Error("Order not found");
      }
      if ((order.duePaisa || 0) > 0) {
        const error = new Error("Settle the outstanding order balance before processing a refund or exchange.");
        error.status = 409;
        throw error;
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
        const refundPaisa =
          Math.floor(orderItem.totalPaisa * (prevReturned + returnReq.quantity) / orderItem.quantity) -
          Math.floor(orderItem.totalPaisa * prevReturned / orderItem.quantity);

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
      const randomSuffix = randomBytes(2).toString("hex").toUpperCase();
      const returnNumber = `RTN-${dateStr}-${randomSuffix}`;

      const newReturn = new Return({
        returnNumber,
        orderId: order._id,
        invoiceNumber: order.invoiceNumber,
        customerId: order.customerId,
        customerSnapshot: order.customerSnapshot,
        items: returnItems,
        totalRefundPaisa,
        cashRefundPaisa: totalRefundPaisa,
        idempotencyKey: input.idempotencyKey,
        requestHash,
        reason,
        staffSnapshot: { id: user.id, name: user.name, role: user.role },
      });

      await newReturn.save({ session });

      // Update Order status based on returned quantities
      const allItemsReturned = order.items.every((item) => {
        const returnedTotal =
          (alreadyReturnedQty[item.variantId.toString()] || 0) +
          (items.find((ri) => ri.variantId.toString() === item.variantId.toString())?.quantity || 0);
        return returnedTotal >= item.quantity;
      });
      order.status = allItemsReturned ? "RETURNED" : "PARTIALLY_RETURNED";
      await order.save({ session });

      // Revert customer lifetime spent stats proportionally (floor at 0)
      if (order.customerId && totalRefundPaisa > 0) {
        await Customer.findByIdAndUpdate(
          order.customerId,
          [
            {
              $set: {
                "stats.totalSpentPaisa": {
                  $max: [0, { $subtract: [{ $ifNull: ["$stats.totalSpentPaisa", 0] }, totalRefundPaisa] }],
                },
              },
            },
          ],
          { session }
        );
      }

      result = newReturn;
    };
    if (ownsSession) await session.withTransaction(execute, {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    });
    else await execute();
  } catch (error) {
    if (ownsSession && error?.code === 11000) {
      const existing = await Return.findOne({ idempotencyKey: input.idempotencyKey });
      if (existing) {
        if (existing.requestHash && existing.requestHash !== requestHash) {
          const conflict = new Error("This idempotency key was already used for a different return.");
          conflict.status = 409;
          throw conflict;
        }
        return existing;
      }
    }
    throw error;
  } finally {
    if (ownsSession && session) await session.endSession();
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
    return res.status(error.status || 400).json({
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

    if (!returnPayload.idempotencyKey || !salePayload.idempotencyKey ||
        returnPayload.idempotencyKey !== salePayload.idempotencyKey) {
      return res.status(400).json({
        success: false,
        message: "A shared idempotency key is required for this exchange.",
      });
    }

    // Validate the replacement sale before applying the return so malformed
    // payloads cannot restock an item without issuing the replacement invoice.
    const validatedSalePayload = saleInputSchema.parse(salePayload);

    await connectToDatabase();
    assertTransactionSupport();
    const session = await mongoose.startSession();
    let returnResult;
    let saleResult;
    try {
      await session.withTransaction(async () => {
        returnResult = await executeReturn(returnPayload, req.user, { session });
        const refundCredit = returnResult.totalRefundPaisa;
        const requestedVariantIds = [...new Set(validatedSalePayload.items.map((item) => item.variantId))];
        const replacementVariants = await ProductVariant.find({
          _id: { $in: requestedVariantIds },
          status: "ACTIVE",
        }).session(session).lean();
        const replacementVariantById = new Map(replacementVariants.map((variant) => [variant._id.toString(), variant]));
        const replacementSubtotalPaisa = validatedSalePayload.items.reduce((sum, item) => {
          const variant = replacementVariantById.get(item.variantId);
          if (!variant || variant.productId.toString() !== item.productId) {
            const error = new Error("One of the replacement items is unavailable.");
            error.status = 400;
            throw error;
          }
          const unitPricePaisa = item.overriddenPricePaisa ?? variant.sellingPricePaisa;
          return sum + unitPricePaisa * item.quantity;
        }, 0);
        const replacementTotalPaisa = Math.max(0, replacementSubtotalPaisa - validatedSalePayload.discountPaisa);
        const exchangeCreditPaisa = Math.min(refundCredit, replacementTotalPaisa);
        returnResult.exchangeCreditPaisa = exchangeCreditPaisa;
        returnResult.cashRefundPaisa = refundCredit - exchangeCreditPaisa;
        await returnResult.save({ session });

        if (exchangeCreditPaisa > 0) {
          validatedSalePayload.payments = validatedSalePayload.payments || [];
          validatedSalePayload.payments.push({
            method: "OTHER",
            amountPaisa: exchangeCreditPaisa,
            reference: `Exchange Credit (RTN: ${returnResult.returnNumber})`,
          });
          validatedSalePayload.notes = `Exchange for Order ${returnPayload.orderId}. ` + (validatedSalePayload.notes || "");
        }
        saleResult = await completeSale(validatedSalePayload, req.user, { session });
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
    } finally {
      await session.endSession();
    }

    return res.status(201).json({
      success: true,
      message: "Exchange processed successfully.",
      data: { return: returnResult, sale: saleResult },
    });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 400).json({
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
