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

const MONGO_URI = process.env.MONGODB_URI;

// Brands requested
const BRANDS_LIST = [
  "Red Tape", "Levi's", "Killer", "PUMA", "The Bear House", 
  "Balmain Paris", "Park Avenue", "Adidas", "H&M", "Spykar", 
  "Peter England", "Mufti"
];

const CAT_LIST = ["Shirts", "T-Shirts", "Jeans", "Trousers", "Shoes", "Formal Shirt", "Casual Shirt", "Slim Fit", "Straight Fit", "Sneakers"];

async function seedData() {
  try {
    console.log('Connecting to DB...');
    await mongoose.connect(MONGO_URI);
    
    console.log('Clearing old Products & Variants...');
    await Product.deleteMany({});
    await ProductVariant.deleteMany({});

    // Create / Get Brands
    const brandMap = {};
    for (const b of BRANDS_LIST) {
      const doc = await Brand.findOneAndUpdate({ name: b }, { name: b, status: 'ACTIVE' }, { upsert: true, new: true });
      brandMap[b] = doc;
    }

    // Create / Get Categories
    const catMap = {};
    for (const c of CAT_LIST) {
      const doc = await Category.findOneAndUpdate({ name: c }, { name: c, gender: "MEN", status: 'ACTIVE' }, { upsert: true, new: true });
      catMap[c] = doc;
    }

    const products = [
      // 1. Red Tape - white formal shirts
      {
        name: "Red Tape Men's Solid Formal Full Sleeve Shirt", brand: "Red Tape", category: "Formal Shirt",
        desc: "Premium white formal shirt for men.",
        variants: [
          { sku: "RT-FML-WHT-39", color: "White", size: "39", mrpPaisa: 159900, cp: 60000, sp: 99900, stock: 20 },
          { sku: "RT-FML-WHT-40", color: "White", size: "40", mrpPaisa: 159900, cp: 60000, sp: 99900, stock: 25 },
        ]
      },
      // 2. Levi's - men's jeans
      {
        name: "Levi's 511 Slim Fit Men's Jeans", brand: "Levi's", category: "Slim Fit",
        desc: "Classic slim fit denim.",
        variants: [
          { sku: "LEV-511-BLU-32", color: "Blue", size: "32", mrpPaisa: 299900, cp: 120000, sp: 219900, stock: 15 },
          { sku: "LEV-511-DBLU-32", color: "Dark Blue", size: "32", mrpPaisa: 299900, cp: 120000, sp: 219900, stock: 12 },
          { sku: "LEV-511-LIND-34", color: "Light Indigo", size: "34", mrpPaisa: 299900, cp: 120000, sp: 219900, stock: 8 },
        ]
      },
      // 3. Killer - jeans + shirts
      {
        name: "Killer Men's Denim Jeans", brand: "Killer", category: "Jeans",
        desc: "Rugged and stylish denim jeans.",
        variants: [
          { sku: "KIL-JNS-BLU-32", color: "Blue", size: "32", mrpPaisa: 249900, cp: 110000, sp: 189900, stock: 20 },
          { sku: "KIL-JNS-DBLU-34", color: "Dark Blue", size: "34", mrpPaisa: 249900, cp: 110000, sp: 189900, stock: 18 },
          { sku: "KIL-JNS-BLK-32", color: "Black", size: "32", mrpPaisa: 249900, cp: 110000, sp: 189900, stock: 15 },
        ]
      },
      {
        name: "Killer Men's White Shirts", brand: "Killer", category: "Shirts",
        desc: "Classic white shirts collection.",
        variants: [
          { sku: "KIL-SHT-WHT-M", color: "White", size: "M", mrpPaisa: 189900, cp: 80000, sp: 129900, stock: 30 },
          { sku: "KIL-SHT-WFML-L", color: "White Formal", size: "L", mrpPaisa: 199900, cp: 85000, sp: 139900, stock: 25 },
        ]
      },
      // 4. PUMA - T-shirts
      {
        name: "PUMA Men's Logo Graphic T-Shirt", brand: "PUMA", category: "T-Shirts",
        desc: "Essential graphic logo tee.",
        variants: [
          { sku: "PMA-TEE-WHT-M", color: "White", size: "M", mrpPaisa: 129900, cp: 50000, sp: 89900, stock: 40 },
          { sku: "PMA-TEE-BLK-L", color: "Black", size: "L", mrpPaisa: 129900, cp: 50000, sp: 89900, stock: 35 },
        ]
      },
      // 5. The Bear House - white men's shirts
      {
        name: "The Bear House White Shirts", brand: "The Bear House", category: "Shirts",
        desc: "Premium white solid and textured shirts.",
        variants: [
          { sku: "TBH-SHT-WSOL-M", color: "White Solid Regular Fit", size: "M", mrpPaisa: 199900, cp: 90000, sp: 149900, stock: 20 },
          { sku: "TBH-SHT-WTAL-L", color: "White Tailored Fit", size: "L", mrpPaisa: 199900, cp: 90000, sp: 149900, stock: 15 },
          { sku: "TBH-SHT-WTEX-M", color: "White Textured", size: "M", mrpPaisa: 219900, cp: 95000, sp: 159900, stock: 10 },
          { sku: "TBH-SHT-WSTR-L", color: "White Striped", size: "L", mrpPaisa: 219900, cp: 95000, sp: 159900, stock: 10 },
        ]
      },
      // 6. Balmain Paris - white + black shirts
      {
        name: "Balmain Men's Premium Shirt", brand: "Balmain Paris", category: "Shirts",
        desc: "Luxury designer shirts.",
        variants: [
          { sku: "BAL-SHT-WHT-40", color: "White", size: "40", mrpPaisa: 1299900, cp: 500000, sp: 1199900, stock: 5 },
          { sku: "BAL-SHT-BLK-40", color: "Black", size: "40", mrpPaisa: 1299900, cp: 500000, sp: 1199900, stock: 5 },
        ]
      },
      // 7. Park Avenue - formal trousers
      {
        name: "Park Avenue Regular Fit Formal Trousers", brand: "Park Avenue", category: "Trousers",
        desc: "Classic formal trousers for office wear.",
        variants: [
          { sku: "PA-TRS-BLK-32", color: "Black", size: "32", mrpPaisa: 249900, cp: 90000, sp: 179900, stock: 20 },
          { sku: "PA-TRS-NVY-34", color: "Navy", size: "34", mrpPaisa: 249900, cp: 90000, sp: 179900, stock: 18 },
          { sku: "PA-TRS-GRY-32", color: "Grey", size: "32", mrpPaisa: 249900, cp: 90000, sp: 179900, stock: 15 },
          { sku: "PA-TRS-CHR-34", color: "Charcoal", size: "34", mrpPaisa: 249900, cp: 90000, sp: 179900, stock: 12 },
        ]
      },
      // 8. Adidas - trousers
      {
        name: "Adidas Men's Track Trousers", brand: "Adidas", category: "Trousers",
        desc: "Sporty and comfortable trousers.",
        variants: [
          { sku: "ADI-TRS-BLK-M", color: "Black", size: "M", mrpPaisa: 299900, cp: 120000, sp: 219900, stock: 25 },
          { sku: "ADI-TRS-BWS-L", color: "Black/White 3-Stripes", size: "L", mrpPaisa: 329900, cp: 130000, sp: 249900, stock: 20 },
          { sku: "ADI-TRS-NVY-M", color: "Navy", size: "M", mrpPaisa: 299900, cp: 120000, sp: 219900, stock: 15 },
          { sku: "ADI-TRS-GRY-L", color: "Grey", size: "L", mrpPaisa: 299900, cp: 120000, sp: 219900, stock: 10 },
        ]
      },
      // 9. Adidas - shoes
      {
        name: "Adidas Men's Sneakers", brand: "Adidas", category: "Sneakers",
        desc: "Classic sneakers for everyday style.",
        variants: [
          { sku: "ADI-SNK-WHT-9", color: "White", size: "9", mrpPaisa: 599900, cp: 250000, sp: 459900, stock: 15 },
          { sku: "ADI-SNK-BLK-10", color: "Black", size: "10", mrpPaisa: 599900, cp: 250000, sp: 459900, stock: 12 },
          { sku: "ADI-SNK-BWS-9", color: "White + Black", size: "9", mrpPaisa: 649900, cp: 270000, sp: 499900, stock: 10 },
        ]
      },
      // 10. H&M - men's jeans
      {
        name: "H&M Men's Denim Jeans", brand: "H&M", category: "Jeans",
        desc: "Stylish denim from H&M.",
        variants: [
          { sku: "HM-JNS-BLU-32", color: "Blue", size: "32", mrpPaisa: 199900, cp: 80000, sp: 149900, stock: 25 },
          { sku: "HM-JNS-DBLU-34", color: "Dark Blue", size: "34", mrpPaisa: 199900, cp: 80000, sp: 149900, stock: 20 },
          { sku: "HM-JNS-LBLU-32", color: "Light Blue", size: "32", mrpPaisa: 199900, cp: 80000, sp: 149900, stock: 15 },
          { sku: "HM-JNS-BLK-34", color: "Black", size: "34", mrpPaisa: 199900, cp: 80000, sp: 149900, stock: 18 },
          { sku: "HM-JNS-STR-32", color: "Straight Jeans", size: "32", mrpPaisa: 219900, cp: 90000, sp: 169900, stock: 10 },
          { sku: "HM-JNS-SLM-34", color: "Slim Jeans", size: "34", mrpPaisa: 219900, cp: 90000, sp: 169900, stock: 12 },
        ]
      },
      // 11. Spykar - men's jeans
      {
        name: "Spykar Men's Jeans", brand: "Spykar", category: "Jeans",
        desc: "Trendy jeans collection.",
        variants: [
          { sku: "SPY-JNS-BLU-32", color: "Blue", size: "32", mrpPaisa: 249900, cp: 110000, sp: 189900, stock: 30 },
          { sku: "SPY-JNS-DBLU-34", color: "Dark Blue", size: "34", mrpPaisa: 249900, cp: 110000, sp: 189900, stock: 25 },
          { sku: "SPY-JNS-BLK-32", color: "Black", size: "32", mrpPaisa: 249900, cp: 110000, sp: 189900, stock: 20 },
        ]
      },
      // 12. Peter England - formal shirts
      {
        name: "Peter England Men's Formal Collection", brand: "Peter England", category: "Formal Shirt",
        desc: "Classic formal wear.",
        variants: [
          { sku: "PE-SHT-WFML-39", color: "White Formal", size: "39", mrpPaisa: 169900, cp: 70000, sp: 119900, stock: 40 },
          { sku: "PE-SHT-WSTR-40", color: "White Striped", size: "40", mrpPaisa: 179900, cp: 75000, sp: 129900, stock: 30 },
          { sku: "PE-SHT-WPAT-39", color: "White Lined/Pattern", size: "39", mrpPaisa: 179900, cp: 75000, sp: 129900, stock: 25 },
          { sku: "PE-TRS-BLK-32", color: "Black", size: "32", mrpPaisa: 199900, cp: 80000, sp: 139900, stock: 20 },
          { sku: "PE-TRS-NVY-34", color: "Navy", size: "34", mrpPaisa: 199900, cp: 80000, sp: 139900, stock: 15 },
          { sku: "PE-TRS-GRY-32", color: "Grey", size: "32", mrpPaisa: 199900, cp: 80000, sp: 139900, stock: 18 },
          { sku: "PE-TRS-WHT-34", color: "White/Light", size: "34", mrpPaisa: 199900, cp: 80000, sp: 139900, stock: 10 },
        ]
      },
      // 13. Mufti - white shirts
      {
        name: "Mufti Men's White Shirts", brand: "Mufti", category: "Shirts",
        desc: "Stylish white shirts.",
        variants: [
          { sku: "MUF-SHT-WSOL-M", color: "White Solid", size: "M", mrpPaisa: 189900, cp: 85000, sp: 139900, stock: 25 },
          { sku: "MUF-SHT-WSLM-L", color: "White Slim-Fit", size: "L", mrpPaisa: 199900, cp: 90000, sp: 149900, stock: 20 },
          { sku: "MUF-SHT-WFML-M", color: "White Formal", size: "M", mrpPaisa: 189900, cp: 85000, sp: 139900, stock: 15 },
        ]
      }
    ];

    console.log('Inserting products...');
    for (const p of products) {
      const bDoc = brandMap[p.brand];
      const cDoc = catMap[p.category];
      const code = 'PROD-' + Math.random().toString(36).substring(2,8).toUpperCase();
      const productDoc = await Product.create({
        productCode: code,
        name: p.name,
        brandId: bDoc._id,
        brandSnapshot: bDoc.name,
        categoryId: cDoc._id,
        categorySnapshot: cDoc.name,
        description: p.desc,
        status: "ACTIVE"
      });

      for (const v of p.variants) {
        await ProductVariant.create({
          productId: productDoc._id,
          sku: v.sku,
          color: v.color,
          size: v.size,
          mrpPaisa: v.mrpPaisa,
          costPricePaisa: v.cp,
          sellingPricePaisa: v.sp,
          stock: v.stock,
          status: "ACTIVE"
        });
      }
    }

    console.log('Done seeding products!');
    process.exit(0);

  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

seedData();
