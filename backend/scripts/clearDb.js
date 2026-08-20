import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import connectToDatabase from "../src/config/db.js";

async function clearDb() {
  await connectToDatabase();
  console.log("Connected to DB. Clearing collections...");
  
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
    console.log(`Cleared ${collection.name}`);
  }
  
  console.log("Database cleared successfully!");
  process.exit(0);
}

clearDb().catch(console.error);
