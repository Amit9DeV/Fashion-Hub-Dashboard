import mongoose from "mongoose";
import connectToDatabase, { assertTransactionSupport } from "../config/db.js";
import Product from "../models/Product.js";
import ProductVariant from "../models/ProductVariant.js";
import Brand from "../models/Brand.js";
import Category from "../models/Category.js";
import InventoryMovement from "../models/InventoryMovement.js";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const getProducts = async (req, res) => {
  try {
    const query = req.query.query?.trim().slice(0, 80) || "";
    await connectToDatabase();

    // First, find matching variants or matching products
    const search = query ? new RegExp(escapeRegExp(query), "i") : null;

    let productMatch = { status: "ACTIVE" };
    if (search) {
      productMatch.$or = [
        { name: search },
        { brandSnapshot: search },
        { categorySnapshot: search },
      ];
    }

    // POS specific optimized query
    // In POS, we typically search by SKU or Barcode first.
    let variantFilter = { status: "ACTIVE" };
    if (search) {
      variantFilter.$or = [{ sku: search }, { barcode: search }];
    }

    // Since we need to join products and variants, and mongoose doesn't do deep text search easily without aggregation,
    // Let's just fetch all active products if no query, or match products/variants if query.
    // For small/medium datasets, fetching the matching products and variants works.

    let items = [];

    // Aggregation pipeline to join variants with products and filter
    const pipeline = [
      { $match: { status: "ACTIVE" } },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      { $match: { "product.status": "ACTIVE" } },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { sku: search },
            { barcode: search },
            { "product.name": search },
            { "product.brandSnapshot": search },
            { "product.categorySnapshot": search },
          ],
        },
      });
    }

    pipeline.push({ $limit: 40 });

    const results = await ProductVariant.aggregate(pipeline);

    items = results.map((v) => ({
      productId: v.product._id.toString(),
      variantId: v._id.toString(),
      productName: v.product.name,
      brand: v.product.brandSnapshot,
      category: v.product.categorySnapshot,
      sku: v.sku,
      barcode: v.barcode,
      color: v.color,
      size: v.size,
      mrpPaisa: v.mrpPaisa || v.sellingPricePaisa,
      sellingPricePaisa: v.sellingPricePaisa,
      stock: v.stock,
    }));

    return res.json({ success: true, data: { items } });
  } catch (error) {
    console.error(error);
    return res
      .status(error.status || 500)
      .json({ success: false, message: "Could not search products." });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    await connectToDatabase();
    
    const query = req.query.query?.trim().slice(0, 80) || "";
    const brand = req.query.brand?.trim() || "";
    const category = req.query.category?.trim() || "";
    const search = query ? new RegExp(escapeRegExp(query), "i") : null;
    
    let match = {};
    if (search) {
      match.$or = [
        { name: search },
        { brandSnapshot: search },
        { categorySnapshot: search },
      ];
    }
    if (brand && brand !== "All" && brand !== "All Brands") {
      if (mongoose.Types.ObjectId.isValid(brand)) {
        match.$and = match.$and || [];
        match.$and.push({ $or: [{ brandId: new mongoose.Types.ObjectId(brand) }, { brandSnapshot: brand }] });
      } else {
        match.brandSnapshot = brand;
      }
    }
    if (category && category !== "All" && category !== "All Categories") {
      if (mongoose.Types.ObjectId.isValid(category)) {
        match.$and = match.$and || [];
        match.$and.push({ $or: [{ categoryId: new mongoose.Types.ObjectId(category) }, { categorySnapshot: category }] });
      } else {
        match.categorySnapshot = category;
      }
    }

    // Aggregation to get products with their variant count and total stock
    const products = await Product.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "productvariants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
      {
        $addFields: {
          variantCount: { $size: "$variants" },
          totalStock: { $sum: "$variants.stock" },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return res.json({ success: true, data: { products } });
  } catch (error) {
    console.error(error);
    return res
      .status(error.status || 500)
      .json({ success: false, message: "Could not fetch products." });
  }
};

export const getProductById = async (req, res) => {
  try {
    await connectToDatabase();
    const product = await Product.findById(req.params.id).lean();
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    const variants = await ProductVariant.find({
      productId: product._id,
    }).lean();
    product.variants = variants;

    return res.json({ success: true, data: { product } });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Could not fetch product." });
  }
};

export const createProduct = async (req, res) => {
  if (req.user.role !== "ADMIN" && req.user.role !== "MANAGER") {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }

  let session;
  try {
    await connectToDatabase();
    assertTransactionSupport();
    session = await mongoose.startSession();
    session.startTransaction();

    const { name, brandId, categoryId, description, variants, images } = req.body;

    const safeBrandId = brandId || null;
    const safeCategoryId = categoryId || null;

    // Fetch snapshots
    const brandQuery = safeBrandId ? Brand.findById(safeBrandId) : null;
    const categoryQuery = safeCategoryId ? Category.findById(safeCategoryId) : null;
    const brand = brandQuery ? await brandQuery.session(session) : null;
    const category = categoryQuery ? await categoryQuery.session(session) : null;

    const product = new Product({
      name,
      brandId: safeBrandId,
      brandSnapshot: brand ? brand.name : null,
      categoryId: safeCategoryId,
      categorySnapshot: category ? category.name : null,
      description,
      images: Array.isArray(images) ? images.filter(Boolean) : (images ? [images] : []),
      status: "ACTIVE",
    });

    await product.save(session ? { session } : {});

    if (variants && variants.length > 0) {
      const variantDocs = variants.map((v) => ({
        productId: product._id,
        sku: v.sku,
        color: v.color,
        size: v.size,
        barcode: v.barcode || undefined,
        costPricePaisa: Math.round((parseFloat(v.costPrice) || 0) * 100),
        mrpPaisa: Math.round((parseFloat(v.mrp) || 0) * 100),
        sellingPricePaisa: Math.round((parseFloat(v.sellingPrice) || 0) * 100),
        stock: parseInt(v.stock || "0", 10),
        status: "ACTIVE",
      }));

      const insertedVariants = await ProductVariant.insertMany(variantDocs, session ? { session } : {});

      // Log initial inventory movements
      const movements = insertedVariants
        .filter((v) => v.stock > 0)
        .map((v) => ({
          productId: product._id,
          variantId: v._id,
          skuSnapshot: v.sku,
          productNameSnapshot: product.name,
          type: "PURCHASE",
          quantityDelta: v.stock,
          referenceType: "Product",
          referenceId: product._id,
          reason: "Initial Stock",
          performedBy: { id: req.user.id, name: req.user.name || "Admin" },
          occurredAt: new Date(),
        }));

      if (movements.length > 0) {
        await InventoryMovement.insertMany(movements, session ? { session } : {});
      }
    }

    if (session) {
      await session.commitTransaction();
      await session.endSession();
    }

    return res.json({ success: true, data: { product } });
  } catch (error) {
    if (session) {
      if (session.inTransaction()) await session.abortTransaction();
      await session.endSession();
    }
    console.error(error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Could not create product." });
  }
};

export const updateProduct = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN" && req.user.role !== "MANAGER") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    await connectToDatabase();

    const { name, brandId, categoryId, description, status, images } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (images !== undefined) updates.images = Array.isArray(images) ? images.filter(Boolean) : (images ? [images] : []);

    if (brandId !== undefined) {
      updates.brandId = brandId || null;
      const brand = brandId ? await Brand.findById(brandId) : null;
      updates.brandSnapshot = brand ? brand.name : null;
    }

    if (categoryId !== undefined) {
      updates.categoryId = categoryId || null;
      const category = categoryId ? await Category.findById(categoryId) : null;
      updates.categorySnapshot = category ? category.name : null;
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true },
    );
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    return res.json({ success: true, data: { product } });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Could not update product." });
  }
};

export const addVariant = async (req, res) => {
  if (req.user.role !== "ADMIN" && req.user.role !== "MANAGER") {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }

  let session;
  try {
    await connectToDatabase();
    assertTransactionSupport();
    session = await mongoose.startSession();
    session.startTransaction();

    const product = await Product.findById(req.params.id).session(session);
    if (!product) {
      if (session) {
        await session.abortTransaction();
        await session.endSession();
      }
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const { sku, color, size, sellingPrice, costPrice, mrp, barcode, stock } = req.body;

    const variant = new ProductVariant({
      productId: req.params.id,
      sku,
      color,
      size,
      barcode: barcode || undefined,
      costPricePaisa: Math.round((parseFloat(costPrice) || 0) * 100),
      mrpPaisa: Math.round((parseFloat(mrp) || 0) * 100),
      sellingPricePaisa: Math.round((parseFloat(sellingPrice) || 0) * 100),
      stock: parseInt(stock || "0", 10),
      status: "ACTIVE",
    });

    await variant.save(session ? { session } : {});

    if (variant.stock > 0) {
      await InventoryMovement.create(
        [{
          productId: product._id,
          variantId: variant._id,
          skuSnapshot: variant.sku,
          productNameSnapshot: product.name,
          type: "PURCHASE",
          quantityDelta: variant.stock,
          referenceType: "ProductVariant",
          referenceId: variant._id,
          reason: "Variant Creation",
          performedBy: { id: req.user.id, name: req.user.name || "Admin" },
          occurredAt: new Date(),
        }],
        session ? { session } : {},
      );
    }

    if (session) {
      await session.commitTransaction();
      await session.endSession();
    }

    return res.json({ success: true, data: { variant } });
  } catch (error) {
    if (session) {
      if (session.inTransaction()) await session.abortTransaction();
      await session.endSession();
    }
    console.error(error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Could not add variant." });
  }
};

export const updateVariant = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN" && req.user.role !== "MANAGER") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    await connectToDatabase();

    const {
      sku,
      color,
      size,
      sellingPrice,
      costPrice,
      mrp,
      barcode,
      status,
      stock,
    } = req.body;
    const updates = {};

    if (sku !== undefined) updates.sku = sku;
    if (color !== undefined) updates.color = color;
    if (size !== undefined) updates.size = size;
    if (barcode !== undefined) updates.barcode = barcode || undefined;
    if (status !== undefined) updates.status = status;
    if (sellingPrice !== undefined)
      updates.sellingPricePaisa = Math.round(
        (parseFloat(sellingPrice) || 0) * 100,
      );
    if (costPrice !== undefined)
      updates.costPricePaisa = Math.round((parseFloat(costPrice) || 0) * 100);
    if (mrp !== undefined)
      updates.mrpPaisa = Math.round((parseFloat(mrp) || 0) * 100);

    // Stock changes must always be audited via InventoryMovement
    let oldStock = null;
    if (stock !== undefined) {
      const newStock = parseInt(stock, 10);
      if (!isNaN(newStock)) {
        // Fetch old stock before overwriting
        const existingVariant = await ProductVariant.findOne(
          { _id: req.params.variantId, productId: req.params.id },
          "stock"
        );
        if (existingVariant) {
          oldStock = existingVariant.stock;
          updates.stock = newStock;
        }
      }
    }

    const variant = await ProductVariant.findOneAndUpdate(
      { _id: req.params.variantId, productId: req.params.id },
      { $set: updates },
      { new: true },
    );

    if (!variant)
      return res.status(404).json({ success: false, message: "Variant not found" });

    // Write inventory movement if stock was manually adjusted
    if (oldStock !== null && variant.stock !== oldStock) {
      const quantityDelta = variant.stock - oldStock;
      const product = await (await import("../models/Product.js")).default.findById(req.params.id).lean();
      await InventoryMovement.create({
        productId: variant.productId,
        variantId: variant._id,
        skuSnapshot: variant.sku,
        productNameSnapshot: product?.name || "Unknown",
        type: "MANUAL_ADJUSTMENT",
        quantityDelta,
        referenceType: "ProductVariant",
        referenceId: variant._id,
        reason: `Manual stock adjustment by ${req.user.name || req.user.id}`,
        performedBy: { id: req.user.id, name: req.user.name || "Admin" },
        occurredAt: new Date(),
      });
    }

    return res.json({ success: true, data: { variant } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not update variant." });
  }
};

// @route   POST /api/products/variants/bulk-update
// @desc    Bulk update prices or fields for multiple variants
// @access  Private (ADMIN/MANAGER only)
export const bulkUpdateVariants = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN" && req.user.role !== "MANAGER") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    await connectToDatabase();

    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: "No updates provided." });
    }

    const bulkOps = updates.map((item) => {
      const setFields = {};
      if (item.costPricePaisa !== undefined) setFields.costPricePaisa = Math.round(Number(item.costPricePaisa));
      if (item.sellingPricePaisa !== undefined) setFields.sellingPricePaisa = Math.round(Number(item.sellingPricePaisa));
      if (item.mrpPaisa !== undefined) setFields.mrpPaisa = Math.round(Number(item.mrpPaisa));
      if (item.status !== undefined) setFields.status = item.status;

      return {
        updateOne: {
          filter: { _id: item.variantId },
          update: { $set: setFields },
        },
      };
    });

    const result = await ProductVariant.bulkWrite(bulkOps);
    return res.json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} variant(s).`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not bulk update variants." });
  }
};

// NEW: get brands and categories for forms
export const getMasterData = async (req, res) => {
  try {
    await connectToDatabase();
    const brands = await Brand.find({ status: "ACTIVE" })
      .sort({ name: 1 })
      .lean();
    const categories = await Category.find({ status: "ACTIVE" })
      .sort({ name: 1 })
      .lean();

    return res.json({ success: true, data: { brands, categories } });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Could not fetch master data." });
  }
};

export const createBrand = async (req, res) => {
  try {
    await connectToDatabase();
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Name required" });
    const brand = await Brand.create({ name, status: 'ACTIVE' });
    return res.json({ success: true, data: { brand } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not create brand." });
  }
};

export const createCategory = async (req, res) => {
  try {
    await connectToDatabase();
    const { name, gender } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Name required" });
    const validGenders = ["MEN", "WOMEN", "KIDS", "UNISEX"];
    const safeGender = validGenders.includes(gender?.toUpperCase()) ? gender.toUpperCase() : "UNISEX";
    const category = await Category.create({ name, gender: safeGender, status: 'ACTIVE' });
    return res.json({ success: true, data: { category } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not create category." });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN" && req.user.role !== "MANAGER") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    await connectToDatabase();

    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });

    // Archive instead of deleting catalogue and movement history.
    await Product.updateOne({ _id: product._id }, { $set: { status: "INACTIVE" } });
    await ProductVariant.updateMany({ productId: product._id }, { $set: { status: "INACTIVE" } });

    return res.json({ success: true, message: "Product and variants archived. Historical inventory and sales records were preserved." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not delete product." });
  }
};

export const deleteVariant = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN" && req.user.role !== "MANAGER") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    await connectToDatabase();

    const variant = await ProductVariant.findOne({
      _id: req.params.variantId,
      productId: req.params.id,
    });

    if (!variant)
      return res
        .status(404)
        .json({ success: false, message: "Variant not found" });

    // Archive instead of deleting stock and movement history.
    await ProductVariant.updateOne({ _id: variant._id }, { $set: { status: "INACTIVE" } });

    return res.json({
      success: true,
      message: "Variant archived. Historical inventory and sales records were preserved.",
      softDeleted: true,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Could not delete variant." });
  }
};

// @route   GET /api/products/:id/movements
// @desc    Get inventory movements (audit log) for a specific product
// @access  Private
export const getProductMovements = async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const movements = await InventoryMovement.find({ productId: id })
      .sort({ occurredAt: -1 })
      .limit(100)
      .lean();

    return res.json({ success: true, data: { movements } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not fetch product inventory movements." });
  }
};

// @route   GET /api/products/:id/sales
// @desc    Get order sales history for a specific product
// @access  Private
export const getProductSales = async (req, res) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const Order = (await import("../models/Order.js")).default;
    const orders = await Order.find({ "items.productId": id })
      .sort({ completedAt: -1 })
      .limit(50)
      .lean();

    // Map to relevant line items for this product
    const sales = orders.map((order) => {
      const itemsForProduct = (order.items || []).filter(
        (i) => i.productId?.toString() === id.toString()
      );
      const totalUnits = itemsForProduct.reduce((s, i) => s + (i.quantity || 1), 0);
      const totalRevenuePaisa = itemsForProduct.reduce((s, i) => s + (i.totalPaisa || 0), 0);

      return {
        orderId: order._id,
        invoiceNumber: order.invoiceNumber,
        completedAt: order.completedAt,
        customerName: order.customerSnapshot?.name || "Walk-in",
        customerMobile: order.customerSnapshot?.mobile || "",
        items: itemsForProduct,
        totalUnits,
        totalRevenuePaisa,
        orderStatus: order.status,
      };
    });

    return res.json({ success: true, data: { sales } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not fetch product sales history." });
  }
};
