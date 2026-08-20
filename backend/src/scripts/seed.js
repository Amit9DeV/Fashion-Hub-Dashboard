import mongoose from "mongoose";
import dotenv from "dotenv";
import Brand from "../models/Brand.js";
import Category from "../models/Category.js";

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

const BRANDS = [
  "Levi's",
  "Nike",
  "U.S. Polo Assn.",
  "Adidas",
  "Mufti",
  "Allen Solly",
  "H&M",
  "Pepe Jeans",
  "Puma",
  "Spykar",
  "Blackberrys",
  "Jockey",
  "The Bear House",
  "Peter England",
  "Red Tape",
];

const CATEGORIES = {
  Shirts: ["Formal Shirt", "Casual Shirt", "Linen Shirt"],
  "T-Shirts": ["Round Neck", "Polo", "Oversized", "Full Sleeve"],
  Jeans: ["Straight Fit", "Slim Fit", "Regular Fit", "Relaxed Fit"],
  Trousers: [],
  Chinos: [],
  "Cargo Pants": [],
  Shorts: [],
  Jackets: [],
  Sweatshirts: [],
  Hoodies: [],
  Innerwear: [],
  "Track Pants": [],
  Shoes: [],
  Accessories: [],
};

async function seedData() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected.");

    // 1. Seed Brands
    console.log("--- Seeding Brands ---");
    for (const brandName of BRANDS) {
      await Brand.findOneAndUpdate(
        { name: brandName },
        { name: brandName, status: "ACTIVE" },
        { upsert: true, new: true },
      );
    }
    const brandCount = await Brand.countDocuments();
    console.log(`✅ Ensure ${brandCount} brands are present.`);

    // 2. Seed Categories
    console.log("--- Seeding Categories ---");
    for (const [parentName, subNames] of Object.entries(CATEGORIES)) {
      // Upsert Parent Category
      const parent = await Category.findOneAndUpdate(
        { name: parentName, parentCategory: null },
        { name: parentName, gender: "MEN", status: "ACTIVE" },
        { upsert: true, new: true },
      );

      // Upsert Subcategories
      for (const subName of subNames) {
        await Category.findOneAndUpdate(
          { name: subName, parentCategory: parent._id },
          {
            name: subName,
            gender: "MEN",
            status: "ACTIVE",
            parentCategory: parent._id,
          },
          { upsert: true, new: true },
        );
      }
    }
    const catCount = await Category.countDocuments();
    console.log(
      `✅ Ensured ${catCount} total categories (including subcategories) are present.`,
    );

    console.log("\n🎉 Seed completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seedData();
