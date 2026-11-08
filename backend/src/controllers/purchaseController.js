import connectToDatabase, { supportsTransactions } from "../config/db.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import Supplier from "../models/Supplier.js";
import ProductVariant from "../models/ProductVariant.js";
import InventoryMovement from "../models/InventoryMovement.js";
import Expense from "../models/Expense.js";
import mongoose from "mongoose";

// @route   POST /api/purchase/suppliers
// @desc    Create a new supplier
// @access  Private
export const createSupplier = async (req, res) => {
  try {
    await connectToDatabase();
    const supplier = await Supplier.create(req.body);
    return res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not create supplier" });
  }
};

// @route   GET /api/purchase/suppliers
// @desc    Get all suppliers
// @access  Private
export const getSuppliers = async (req, res) => {
  try {
    await connectToDatabase();
    const suppliers = await Supplier.find({ status: { $ne: "INACTIVE" } }).sort({ name: 1 }).lean();
    return res.json({ success: true, data: suppliers });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not fetch suppliers" });
  }
};

// @route   PUT /api/purchase/suppliers/:id
// @desc    Update a supplier
// @access  Private
export const updateSupplier = async (req, res) => {
  try {
    await connectToDatabase();
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found" });
    return res.json({ success: true, data: supplier });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not update supplier" });
  }
};

// @route   DELETE /api/purchase/suppliers/:id
// @desc    Deactivate a supplier
// @access  Private
export const deleteSupplier = async (req, res) => {
  try {
    await connectToDatabase();
    await Supplier.findByIdAndUpdate(req.params.id, { status: "INACTIVE" });
    return res.json({ success: true, message: "Supplier deactivated" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not delete supplier" });
  }
};

// @route   GET /api/purchase/orders
// @desc    Get all purchase orders
// @access  Private
export const getPurchaseOrders = async (req, res) => {
  try {
    await connectToDatabase();
    const orders = await PurchaseOrder.find()
      .populate("supplierId", "name mobile email gstin")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, data: { orders } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not fetch purchase orders" });
  }
};

// @route   GET /api/purchase/orders/:id
// @desc    Get a single purchase order
// @access  Private
export const getPurchaseOrderById = async (req, res) => {
  try {
    await connectToDatabase();
    const order = await PurchaseOrder.findById(req.params.id)
      .populate("supplierId")
      .lean();
    if (!order) return res.status(404).json({ success: false, message: "Purchase order not found" });
    return res.json({ success: true, data: { order } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not fetch purchase order" });
  }
};

// @route   DELETE /api/purchase/orders/:id
// @desc    Delete a purchase order
// @access  Private
export const deletePurchaseOrder = async (req, res) => {
  try {
    await connectToDatabase();
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ success: false, message: "Purchase order not found" });
    if (po.status === "RECEIVED") {
      return res.status(400).json({ success: false, message: "Cannot delete a received purchase order" });
    }
    await PurchaseOrder.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: "Purchase order deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Could not delete purchase order" });
  }
};

// @route   POST /api/purchase/orders
// @desc    Create a new purchase order
// @access  Private
export const createPurchaseOrder = async (req, res) => {
  try {
    await connectToDatabase();
    const { supplierId, items, expectedDeliveryDate, notes } = req.body;
    
    const supplier = await Supplier.findById(supplierId).lean();
    if (!supplier) throw new Error("Supplier not found");

    const totalAmountPaisa = items.reduce((sum, item) => sum + item.totalPaisa, 0);
    const poNumber = `PO/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`;

    const po = await PurchaseOrder.create({
      poNumber,
      supplierId,
      supplierSnapshot: { name: supplier.name, gstin: supplier.gstin },
      items,
      totalAmountPaisa,
      expectedDeliveryDate,
      notes,
      createdBy: req.user.id
    });

    return res.status(201).json({ success: true, data: po });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Could not create PO" });
  }
};

// @route   POST /api/purchase/orders/:id/receive
// @desc    Mark a PO as received, update stock, and log expense
// @access  Private
export const receivePurchaseOrder = async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    
    let session = await mongoose.startSession();
    const isStandalone = !supportsTransactions();
    if (isStandalone) {
      await session.endSession();
      session = null;
    }
    
    const runBlock = isStandalone ? (cb) => cb() : (cb, opts) => session.withTransaction(cb, opts);

    let updatedPo;

    try {
      await runBlock(async () => {
        const po = await PurchaseOrder.findById(id).session(isStandalone ? null : session);
        if (!po) throw new Error("PO not found");
        if (po.status === "RECEIVED") throw new Error("PO already received");

        po.status = "RECEIVED";
        po.receivedAt = new Date();
        await po.save({ session: isStandalone ? null : session });

        // Update stock with Weighted Average Costing (WAC)
        const bulkOps = po.items.map(item => ({
          updateOne: {
            filter: { _id: item.variantId },
            update: [
              {
                $set: {
                  costPricePaisa: {
                    $cond: {
                      if: { $lte: ["$stock", 0] },
                      then: item.costPricePaisa,
                      else: {
                        $round: [
                          {
                            $divide: [
                              { 
                                $add: [
                                  { $multiply: ["$stock", { $ifNull: ["$costPricePaisa", 0] }] },
                                  { $multiply: [item.quantity, item.costPricePaisa] }
                                ]
                              },
                              { $add: ["$stock", item.quantity] }
                            ]
                          },
                          0
                        ]
                      }
                    }
                  },
                  stock: { $add: ["$stock", item.quantity] }
                }
              }
            ]
          }
        }));
        if (bulkOps.length > 0) {
          await ProductVariant.bulkWrite(bulkOps, { session: isStandalone ? null : session });
        }

        // Log Inventory Movements
        const movements = po.items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          skuSnapshot: item.sku,
          productNameSnapshot: item.productName,
          type: "PURCHASE",
          quantityDelta: item.quantity,
          referenceType: "PURCHASE_ORDER",
          referenceId: po._id,
          reason: `Received PO ${po.poNumber}`,
          performedBy: { id: req.user.id, name: req.user.name },
          occurredAt: po.receivedAt
        }));
        await InventoryMovement.insertMany(movements, { session: isStandalone ? null : session });

        // Create an Expense record
        await Expense.create([{
          title: `Stock Purchase - ${po.poNumber}`,
          amountPaisa: po.totalAmountPaisa,
          category: "STOCK",
          paymentMethod: "OTHER",
          notes: `Supplier: ${po.supplierSnapshot.name}`,
          createdBy: req.user.id
        }], { session: isStandalone ? null : session });

        updatedPo = po;
      });

      return res.json({ success: true, data: updatedPo });
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Could not receive PO" });
  }
};
