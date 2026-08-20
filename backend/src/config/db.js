import mongoose from "mongoose";

const globalForMongoose = global;

const cached = globalForMongoose.mongoose || { conn: null, promise: null };

export default async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI. Copy .env.example to .env.local and configure MongoDB.");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 10,
    });
  }

  cached.conn = await cached.promise;
  globalForMongoose.mongoose = cached;
  return cached.conn;
}
