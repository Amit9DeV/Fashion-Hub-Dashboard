import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import Brand from "../models/Brand.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import ProductVariant from "../models/ProductVariant.js";
import InventoryMovement from "../models/InventoryMovement.js";

async function seed() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Set MONGODB_URI in backend/.env before seeding.");
  }

  const email = (process.env.SEED_ADMIN_EMAIL || "admin@fashionhub.local").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "FashionHub@123";
  if (process.env.NODE_ENV === "production" && (!process.env.SEED_ADMIN_EMAIL || !process.env.SEED_ADMIN_PASSWORD)) {
    throw new Error("Production seeding requires explicit SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD values.");
  }
  if (password.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  let admin = await User.findOne({ email });
  if (!admin) {
    admin = await User.create({
      employeeId: "FH-ADMIN",
      name: "Fashion Hub Admin",
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "ADMIN",
      active: true,
    });
    console.log(`Created admin account: ${email}`);
  } else {
    console.log(`Admin account already exists: ${email}`);
  }

  const brand = await Brand.findOneAndUpdate(
    { name: "Fashion Hub" },
    { $setOnInsert: { name: "Fashion Hub", status: "ACTIVE" } },
    { upsert: true, new: true }
  );
  const category = await Category.findOneAndUpdate(
    { name: "Shirts", parentCategory: null },
    { $setOnInsert: { name: "Shirts", gender: "MEN", status: "ACTIVE", parentCategory: null } },
    { upsert: true, new: true }
  );

  if (process.env.SEED_DEMO_CATALOG === "true") {
    const existingProduct = await Product.findOne({ productCode: "SEED-SHIRT-001" });
    if (!existingProduct) {
      const product = await Product.create({
        productCode: "SEED-SHIRT-001",
        name: "Demo Cotton Shirt",
        brandId: brand._id,
        brandSnapshot: brand.name,
        categoryId: category._id,
        categorySnapshot: category.name,
        description: "Sample product for local setup. Replace with your store catalogue.",
        gender: "MEN",
        status: "ACTIVE",
      });
      const variants = await ProductVariant.create([
        { productId: product._id, sku: "DEMO-SHIRT-WHT-S", color: "White", size: "S", costPricePaisa: 50000, mrpPaisa: 129900, sellingPricePaisa: 99900, stock: 5 },
        { productId: product._id, sku: "DEMO-SHIRT-WHT-M", color: "White", size: "M", costPricePaisa: 50000, mrpPaisa: 129900, sellingPricePaisa: 99900, stock: 5 },
        { productId: product._id, sku: "DEMO-SHIRT-WHT-L", color: "White", size: "L", costPricePaisa: 50000, mrpPaisa: 129900, sellingPricePaisa: 99900, stock: 5 },
      ]);
      await InventoryMovement.insertMany(variants.map((variant) => ({
        productId: product._id,
        variantId: variant._id,
        skuSnapshot: variant.sku,
        productNameSnapshot: product.name,
        type: "PURCHASE",
        quantityDelta: variant.stock,
        referenceType: "Product",
        referenceId: product._id,
        reason: "Initial demo stock",
        performedBy: { id: admin._id.toString(), name: admin.name },
        occurredAt: new Date(),
      })));
      console.log("Created a small demo catalogue because SEED_DEMO_CATALOG=true.");
    } else {
      console.log("Demo product already exists; existing stock was left unchanged.");
    }
  }

  console.log("Seed complete. Use your store's real catalogue before taking live sales.");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
