// Seed script: creates the admin user if it doesn't already exist
import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error("❌  MONGODB_URI not set in .env");
  process.exit(1);
}

async function seed() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("Set SEED_ADMIN_EMAIL and a 12+ character, at most 72-byte SEED_ADMIN_PASSWORD before seeding.");
  }
  await mongoose.connect(MONGO_URI);
  console.log("✅  MongoDB connected");

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`ℹ️   Admin already exists (${existing.email}) — skipping.`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    name: "Fashion Hub Admin",
    email,
    passwordHash,
    role: "ADMIN",
    employeeId: `FH-${Date.now().toString(36).toUpperCase()}`,
    active: true,
  });
  console.log("✅  Admin user created:");
  console.log(`     Email   : ${email}`);
  console.log("     Password: read from SEED_ADMIN_PASSWORD");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  process.exit(1);
});
