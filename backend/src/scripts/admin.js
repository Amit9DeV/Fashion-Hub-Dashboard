import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { pathToFileURL } from "node:url";
import User from "../models/User.js";

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

const ADMIN = {
  employeeId: "FH-ADMIN",
  name: "Fashion Hub Admin",
  email: "admin@fashionhub.com",
  password: "Admin@123",
  role: "ADMIN",
  active: true,
};

export function buildAdminUser() {
  return {
    employeeId: ADMIN.employeeId,
    name: ADMIN.name,
    email: ADMIN.email.toLowerCase(),
    passwordHash: bcrypt.hashSync(ADMIN.password, 12),
    role: ADMIN.role,
    active: ADMIN.active,
  };
}

export async function seedAdmin() {
  try {
    if (!MONGO_URI) {
      throw new Error("Missing MONGODB_URI. Configure your .env file first.");
    }

    console.log("Connecting to database...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected.");

    const existingAdmin = await User.findOne({
      email: ADMIN.email.toLowerCase(),
    });

    if (existingAdmin) {
      console.log("⚠️ Admin already exists.");
      await mongoose.disconnect();
      return;
    }

    const adminUser = buildAdminUser();
    await User.create(adminUser);

    console.log("✅ Admin created successfully!");
    console.log("");
    console.log("Email:", ADMIN.email);
    console.log("Password:", ADMIN.password);

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