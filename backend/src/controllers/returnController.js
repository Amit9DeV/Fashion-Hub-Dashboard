import mongoose from "mongoose";
import Return from "../models/Return.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import crypto from "crypto";
import ProductVariant from "../models/ProductVariant.js";
import InventoryMovement from "../models/InventoryMovement.js";
// @route   POST /api/returns
// @desc    Process a new return
// @access  Private
export const processReturn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { orderId, reason, items } = req.body;
    
    if (!orderId || !items || !items.length) {
      throw new Error("Order ID and returned items are required");
    }

    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new Error("Order not found");
    }

    let totalRefundPaisa = 0;
    const returnItems = [];

    for (const returnReq of items) {
      const orderItem = order.items.find(i => i.variantId.toString() === returnReq.variantId);
      if (!orderItem) {
        throw new Error(`Variant ${returnReq.variantId} was not part of this order`);
      }

      if (returnReq.quantity > orderItem.quantity) {
        throw new Error(`Cannot return more than purchased for SKU ${orderItem.sku}`);
      }
      
      // Calculate refund proportionally (includes tax, discounts)
      // If they return 1 out of 2 items, refund is totalPaisa / 2
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
        refundPaisa: refundPaisa
      });

      totalRefundPaisa += refundPaisa;

      // Restock the product variant
      await ProductVariant.findByIdAndUpdate(
        orderItem.variantId,
        { $inc: { stock: returnReq.quantity } },
        { session }
      );
      
      // Log the movement
      await InventoryMovement.create([{
        variantId: orderItem.variantId,
        type: "RETURN",
        quantityChanged: returnReq.quantity,
        balance: 0, // In reality, we'd need to fetch the updated balance. For this log format, we can query it.
        reason: `Return from Order ${order.invoiceNumber}`,
        referenceId: order._id,
        staffId: req.user.id
      }], { session });
    }

    // Generate unique return number
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD
    const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
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
      staffSnapshot: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role
      }
    });

    await newReturn.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "Return processed successfully",
      data: newReturn
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, error: error.message });
  }
};

// @route   GET /api/returns
// @desc    Get all returns
// @access  Private
export const getReturns = async (req, res) => {
  try {
    const returns = await Return.find().sort({ createdAt: -1 });
    res.json({ success: true, data: returns });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

// @route   GET /api/returns/:id
// @desc    Get single return by ID
// @access  Private
export const getReturnById = async (req, res) => {
  try {
    const returnDoc = await Return.findById(req.params.id);
    if (!returnDoc) return res.status(404).json({ success: false, error: "Return not found" });
    res.json({ success: true, data: returnDoc });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
};
