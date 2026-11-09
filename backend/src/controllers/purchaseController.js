import connectToDatabase, { assertTransactionSupport } from "../config/db.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import Supplier from "../models/Supplier.js";
import ProductVariant from "../models/ProductVariant.js";
import Product from "../models/Product.js";
import InventoryMovement from "../models/InventoryMovement.js";
import Expense from "../models/Expense.js";
import mongoose from "mongoose";

// @route   POST /api/purchase/suppliers
// @desc    Create a new supplier
// @access  Private
export const createSupplier = async (req, res) => {
  try {
    await connectToDatabase();
    const { name, contactPerson, mobile, email, gstin, address } = req.body || {};
    if (typeof name !== "string" || !name.trim() || name.trim().length > 160) {
      return res.status(400).json({ success: false, message: "Supplier name must contain 1–160 characters." });
    }
    const supplier = await Supplier.create({ name: name.trim(), contactPerson, mobile, email, gstin, address });
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
    const allowed = ["name", "contactPerson", "mobile", "email", "gstin", "address", "status"];
    const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
    if (updates.name !== undefined && (typeof updates.name !== "string" || !updates.name.trim() || updates.name.trim().length > 160)) {
      return res.status(400).json({ success: false, message: "Supplier name must contain 1–160 characters." });
    }
    if (updates.status !== undefined && !["ACTIVE", "INACTIVE"].includes(updates.status)) {
      return res.status(400).json({ success: false, message: "Supplier status is invalid." });
    }
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
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
    const { supplierId, items, expectedDeliveryDate, notes } = req.body || {};

    if (!mongoose.isValidObjectId(supplierId) || !Array.isArray(items) || items.length < 1 || items.length > 200) {
      return res.status(400).json({ success: false, message: "Choose a supplier and provide between 1 and 200 purchase lines." });
    }
    const normalizedItems = items.map((item) => ({
      productId: String(item?.productId || ""),
      variantId: String(item?.variantId || ""),
      quantity: Number(item?.quantity),
      costPricePaisa: Number(item?.costPricePaisa),
    }));
    if (normalizedItems.some((item) =>
      !mongoose.isValidObjectId(item.productId) || !mongoose.isValidObjectId(item.variantId) ||
      !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 100000 ||
      !Number.isSafeInteger(item.costPricePaisa) || item.costPricePaisa < 0 || item.costPricePaisa > 100000000000
    )) {
      return res.status(400).json({ success: false, message: "Each purchase line needs a valid product, variant, quantity, and cost." });
    }
    
    const supplier = await Supplier.findById(supplierId).lean();
    if (!supplier) throw new Error("Supplier not found");

    const variantIds = normalizedItems.map((item) => item.variantId);
    if (new Set(variantIds).size !== variantIds.length) {
      return res.status(400).json({ success: false, message: "A variant can appear only once in a purchase order." });
    }
    const variants = await ProductVariant.find({ _id: { $in: variantIds }, status: "ACTIVE" }).lean();
    const variantMap = new Map(variants.map((variant) => [variant._id.toString(), variant]));
    if (variants.length !== normalizedItems.length) {
      return res.status(400).json({ success: false, message: "One or more selected variants are unavailable." });
    }
    const validItems = normalizedItems.map((item) => {
      const variant = variantMap.get(item.variantId);
      if (variant.productId.toString() !== item.productId) {
        const error = new Error("A purchase line does not match its selected product.");
        error.status = 400;
        throw error;
      }
      return {
        productId: variant.productId,
        variantId: variant._id,
        productName: undefined,
        sku: variant.sku,
        quantity: item.quantity,
        costPricePaisa: item.costPricePaisa,
        totalPaisa: item.quantity * item.costPricePaisa,
      };
    });
    const productIds = [...new Set(validItems.map((item) => item.productId.toString()))];
    const products = await Product.find({ _id: { $in: productIds } }).select("name").lean();
    const productNames = new Map(products.map((product) => [product._id.toString(), product.name]));
    for (const item of validItems) item.productName = productNames.get(item.productId.toString()) || "Product";

    const totalAmountPaisa = validItems.reduce((sum, item) => sum + item.totalPaisa, 0);
    if (!Number.isSafeInteger(totalAmountPaisa)) {
      return res.status(400).json({ success: false, message: "Purchase order total is outside the supported amount range." });
    }
    if (expectedDeliveryDate && !Number.isFinite(new Date(expectedDeliveryDate).getTime())) {
      return res.status(400).json({ success: false, message: "Expected delivery date is invalid." });
    }
    const poNumber = `PO/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`;

    const po = await PurchaseOrder.create({
      poNumber,
      supplierId,
      supplierSnapshot: { name: supplier.name, gstin: supplier.gstin },
      items: validItems,
      totalAmountPaisa,
      expectedDeliveryDate,
      notes,
      createdBy: req.user.id
    });

    return res.status(201).json({ success: true, data: po });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Could not create PO" });
  }
};

// @route   POST /api/purchase/orders/:id/receive
// @desc    Mark a PO as received, update stock, and log expense
// @access  Private
export const receivePurchaseOrder = async (req, res) => {
  try {
    await connectToDatabase();
    assertTransactionSupport();
    const { id } = req.params;
    
    const session = await mongoose.startSession();

    let updatedPo;

    try {
      await session.withTransaction(async () => {
        const po = await PurchaseOrder.findById(id).session(session);
        if (!po) throw new Error("PO not found");
        if (po.status === "RECEIVED") throw new Error("PO already received");

        po.status = "RECEIVED";
        po.receivedAt = new Date();
        await po.save({ session });

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
          await ProductVariant.bulkWrite(bulkOps, { session });
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
        await InventoryMovement.insertMany(movements, { session });

        // Create an Expense record
        await Expense.create([{
          title: `Stock Purchase - ${po.poNumber}`,
          amountPaisa: po.totalAmountPaisa,
          category: "STOCK",
          paymentMethod: "OTHER",
          notes: `Supplier: ${po.supplierSnapshot.name}`,
          createdBy: req.user.id
        }], { session });

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
    return res.status(error.status || 500).json({ success: false, message: error.message || "Could not receive PO" });
  }
};
