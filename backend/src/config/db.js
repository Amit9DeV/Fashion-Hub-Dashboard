import mongoose from "mongoose";

// ─── Connection cache (singleton pattern for serverless/pooled runtimes) ──────
const globalForMongoose = global;
const cached = globalForMongoose._mongooseCache || { conn: null, promise: null };

export default async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI. Copy .env.example to .env and configure MongoDB.",
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 10,          // Safe for Atlas M0; increase for paid tiers
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Reset so next call will retry
    cached.promise = null;
    throw err;
  }

  globalForMongoose._mongooseCache = cached;
  return cached.conn;
}
