import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectToDatabase from "../src/config/db.js";
import User from "../src/models/User.js";
import Product from "../src/models/Product.js";
import ProductVariant from "../src/models/ProductVariant.js";
import Brand from "../src/models/Brand.js";
import Category from "../src/models/Category.js";

const oldSeedData = [
  { productCode: "FH-TEE-001", name: "Signature Piqué Polo", brand: "U.S. Polo Assn.", category: "T-Shirts", description: "Premium cotton polo", variants: [
    { sku: "USP-POLO-BLK-M", barcode: "8900001000011", color: "Black", size: "M", sellingPricePaisa: 149900, costPricePaisa: 78000, stock: 12 },
    { sku: "USP-POLO-BLK-L", barcode: "8900001000012", color: "Black", size: "L", sellingPricePaisa: 149900, costPricePaisa: 78000, stock: 9 },
    { sku: "USP-POLO-CRM-L", barcode: "8900001000013", color: "Cream", size: "L", sellingPricePaisa: 149900, costPricePaisa: 78000, stock: 2 },
  ] },
  { productCode: "FH-DNM-001", name: "Levi's 511 Slim Fit", brand: "Levi's", category: "Jeans", description: "Classic slim fit denim", variants: [
    { sku: "LEV-511-IND-32", barcode: "8900001000021", color: "Indigo", size: "32", sellingPricePaisa: 249900, costPricePaisa: 140000, stock: 8 },
    { sku: "LEV-511-IND-34", barcode: "8900001000022", color: "Indigo", size: "34", sellingPricePaisa: 249900, costPricePaisa: 140000, stock: 6 },
  ] },
  { productCode: "FH-SHT-001", name: "Peter England Formal Shirt", brand: "Peter England", category: "Formal Shirt", description: "Crisp white formal shirt", variants: [
    { sku: "PE-FORMAL-WHT-M", barcode: "8900001000031", color: "White", size: "M", sellingPricePaisa: 189900, costPricePaisa: 100000, stock: 5 },
    { sku: "PE-FORMAL-WHT-L", barcode: "8900001000032", color: "White", size: "L", sellingPricePaisa: 189900, costPricePaisa: 100000, stock: 0 },
  ] },
];

async function runSeed() {
  await connectToDatabase();
  console.log("Connected to DB.");

  const passwordHash = await bcrypt.hash("FashionHub@123", 12);
  await User.findOneAndUpdate(
    { email: "admin@fashionhub.local" }, 
    { $set: { name: "Fashion Hub Admin", employeeId: "FH-ADMIN", passwordHash, role: "ADMIN", active: true } }, 
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log("Admin account ready.");

  // Fetch all brands and categories to map names to IDs
  const brands = await Brand.find();
  const categories = await Category.find();

  for (const item of oldSeedData) {
    const brand = brands.find(b => b.name === item.brand);
    const category = categories.find(c => c.name === item.category);

    const productDoc = await Product.findOneAndUpdate(
      { productCode: item.productCode },
      { $set: { 
          name: item.name, 
          description: item.description,
          brandId: brand ? brand._id : null,
          brandSnapshot: item.brand,
          categoryId: category ? category._id : null,
          categorySnapshot: item.category,
          status: "ACTIVE"
      } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    for (const v of item.variants) {
      await ProductVariant.findOneAndUpdate(
        { sku: v.sku },
        { $set: {
            productId: productDoc._id,
            color: v.color,
            size: v.size,
            barcode: v.barcode,
            sellingPricePaisa: v.sellingPricePaisa,
            costPricePaisa: v.costPricePaisa,
            stock: v.stock,
            status: "ACTIVE"
        }},
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`Seeded Product: ${item.name} with ${item.variants.length} variants`);
  }

  console.log("Seed complete: sample Fashion Hub products are ready.");
  process.exit(0);
}

runSeed().catch(console.error);
