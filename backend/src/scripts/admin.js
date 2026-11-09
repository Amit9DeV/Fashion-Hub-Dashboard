import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { pathToFileURL } from "node:url";
import User from "../models/User.js";

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

export async function buildAdminUser({ email, password, name = "Fashion Hub Admin", employeeId = "FH-ADMIN" } = {}) {
  if (!email || !password || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("Provide an admin email and a password of at least 12 characters and at most 72 UTF-8 bytes.");
  }
  return {
    employeeId,
    name,
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, 12),
    role: "ADMIN",
    active: true,
  };
}

export async function seedAdmin() {
  try {
    if (!MONGO_URI) {
      throw new Error("Missing MONGODB_URI. Configure your .env file first.");
    }
    const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!email || !password) throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD before creating an admin.");

    console.log("Connecting to database...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected.");

    const existingAdmin = await User.findOne({
      email,
    });

    if (existingAdmin) {
      console.log("⚠️ Admin already exists.");
      await mongoose.disconnect();
      return;
    }

    const adminUser = await buildAdminUser({ email, password });
    await User.create(adminUser);

    console.log("✅ Admin created successfully!");
    console.log("");
    console.log("Email:", email);

    await mongoose.disconnect();
    console.log("Database disconnected.");
  } catch (error) {
    console.error("❌ Failed to create admin:", error);
    await mongoose.disconnect().catch(() => {});
    throw error;
  }
}

const isDirectScriptExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isDirectScriptExecution) {
  seedAdmin()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
