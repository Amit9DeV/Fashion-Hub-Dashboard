import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Brand from '../models/Brand.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function seedProducts() {
  try {
    if (process.env.NODE_ENV === "production" || process.env.ALLOW_DESTRUCTIVE_CATALOG_SEED !== "true") {
      throw new Error("This legacy seed deletes catalogue records. Run only in a disposable non-production database with ALLOW_DESTRUCTIVE_CATALOG_SEED=true.");
    }
    const MONGO_URI = process.env.MONGODB_URI;
    if (!MONGO_URI) throw new Error('MONGODB_URI is not defined');
    
    console.log('Connecting to database to seed products...');
    await mongoose.connect(MONGO_URI);
    
    const levis = await Brand.findOne({ name: "Levi's" });
    const nike = await Brand.findOne({ name: "Nike" });
    const jeansCat = await Category.findOne({ name: "Straight Fit" });
    const tshirtCat = await Category.findOne({ name: "Round Neck" });

    if (!levis || !nike || !jeansCat || !tshirtCat) {
      throw new Error('Master data (Brands/Categories) not found. Run seed.js first.');
    }

    console.log('Clearing existing products...');
    await Product.deleteMany({});
    await ProductVariant.deleteMany({});

    console.log('Creating products...');
    const p1 = await Product.create({
      name: "Classic Original Fit Jeans",
      brandId: levis._id,
      brandSnapshot: "Levi's",
      categoryId: jeansCat._id,
      categorySnapshot: "Straight Fit",
      description: "The original straight fit jeans.",
      status: "ACTIVE"
    });

    await ProductVariant.create([
      { productId: p1._id, sku: "LEV-COFJ-BLU-32", color: "Blue", size: "32", mrpPaisa: 350000, costPricePaisa: 150000, sellingPricePaisa: 299900, stock: 15 },
      { productId: p1._id, sku: "LEV-COFJ-BLU-34", color: "Blue", size: "34", mrpPaisa: 350000, costPricePaisa: 150000, sellingPricePaisa: 299900, stock: 8 },
      { productId: p1._id, sku: "LEV-COFJ-BLK-32", color: "Black", size: "32", mrpPaisa: 350000, costPricePaisa: 150000, sellingPricePaisa: 299900, stock: 20 },
    ]);

    const p2 = await Product.create({
      name: "Essential Cotton T-Shirt",
      brandId: nike._id,
      brandSnapshot: "Nike",
      categoryId: tshirtCat._id,
      categorySnapshot: "Round Neck",
      description: "Breathable everyday tee.",
      status: "ACTIVE"
    });

    await ProductVariant.create([
      { productId: p2._id, sku: "NIK-ECT-WHT-M", color: "White", size: "M", mrpPaisa: 129900, costPricePaisa: 50000, sellingPricePaisa: 99900, stock: 50 },
      { productId: p2._id, sku: "NIK-ECT-WHT-L", color: "White", size: "L", mrpPaisa: 129900, costPricePaisa: 50000, sellingPricePaisa: 99900, stock: 45 },
      { productId: p2._id, sku: "NIK-ECT-BLK-M", color: "Black", size: "M", mrpPaisa: 129900, costPricePaisa: 50000, sellingPricePaisa: 99900, stock: 12 },
    ]);

    console.log('Products seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed products:', err);
    process.exit(1);
  }
}

seedProducts();
