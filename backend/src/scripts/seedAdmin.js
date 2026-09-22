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

const ADMIN = {
  name: "Admin",
  email: "admin@fashionhub.local",
  password: "FashionHub@123",
  role: "ADMIN",
  employeeId: "EMP001",
  active: true,
};

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("✅  MongoDB connected");

  const existing = await User.findOne({ email: ADMIN.email });
  if (existing) {
    console.log(`ℹ️   Admin already exists (${existing.email}) — skipping.`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN.password, 12);
  await User.create({ ...ADMIN, passwordHash });
  console.log("✅  Admin user created:");
  console.log(`     Email   : ${ADMIN.email}`);
  console.log(`     Password: ${ADMIN.password}`);
  console.log(`     Role    : ${ADMIN.role}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  process.exit(1);
});
