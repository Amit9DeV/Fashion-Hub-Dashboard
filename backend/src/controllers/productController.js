import mongoose from "mongoose";
import connectToDatabase from "../config/db.js";
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
      .status(500)
      .json({ success: false, message: "Could not search products." });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    await connectToDatabase();
    
    const query = req.query.query?.trim().slice(0, 80) || "";
    const search = query ? new RegExp(escapeRegExp(query), "i") : null;
    
    let match = {};
    if (search) {
      match.$or = [
        { name: search },
        { brandSnapshot: search },
        { categorySnapshot: search },
      ];
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
      .status(500)
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
    session = await mongoose.startSession();
    session.startTransaction();

    const { name, brandId, categoryId, description, variants } = req.body;

    const safeBrandId = brandId || null;
    const safeCategoryId = categoryId || null;

    // Fetch snapshots
    const brand = safeBrandId ? await Brand.findById(safeBrandId).session(session) : null;
    const category = safeCategoryId ? await Category.findById(safeCategoryId).session(session) : null;

    const product = new Product({
      name,
      brandId: safeBrandId,
      brandSnapshot: brand ? brand.name : null,
      categoryId: safeCategoryId,
      categorySnapshot: category ? category.name : null,
      description,
      status: "ACTIVE",
    });

    await product.save({ session });

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

      const insertedVariants = await ProductVariant.insertMany(variantDocs, { session });

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
        await InventoryMovement.insertMany(movements, { session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    return res.json({ success: true, data: { product } });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Could not create product." });
  }
};

export const updateProduct = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN" && req.user.role !== "MANAGER") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }
    await connectToDatabase();

    const { name, brandId, categoryId, description, status } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;

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
    session = await mongoose.startSession();
    session.startTransaction();

    const product = await Product.findById(req.params.id).session(session);
    if (!product) {
      await session.abortTransaction();
      session.endSession();
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

    await variant.save({ session });

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
        { session },
      );
    }

    await session.commitTransaction();
    session.endSession();

    return res.json({ success: true, data: { variant } });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not add variant." });
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

    // Safety check: block deletion if product appears in any historical order
    const variants = await ProductVariant.find({ productId: product._id }, "_id").lean();
    const variantIds = variants.map((v) => v._id);
    if (variantIds.length > 0) {
      const Order = (await import("../models/Order.js")).default;
      const orderCount = await Order.countDocuments({ "items.variantId": { $in: variantIds } });
      if (orderCount > 0) {
        // Soft-delete instead of hard delete to preserve ledger integrity
        await Product.findByIdAndUpdate(product._id, { status: "INACTIVE" });
        await ProductVariant.updateMany({ productId: product._id }, { status: "INACTIVE" });
        return res.json({
          success: true,
          message: `Product has ${orderCount} historical order(s). It has been deactivated instead of deleted to preserve ledger integrity.`,
        });
      }
    }

    // Safe to hard-delete (no order history)
    await ProductVariant.deleteMany({ productId: product._id });
    await Product.findByIdAndDelete(product._id);

    return res.json({ success: true, message: "Product and variants deleted successfully." });
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

    const variant = await ProductVariant.findOneAndDelete({
      _id: req.params.variantId,
      productId: req.params.id,
    });
    if (!variant)
      return res
        .status(404)
        .json({ success: false, message: "Variant not found" });

    return res.json({
      success: true,
      message: "Variant deleted successfully.",
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Could not delete variant." });
  }
};
