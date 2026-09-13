import mongoose from "mongoose";

const globalForMongoose = global;

const cached = globalForMongoose.mongoose || { conn: null, promise: null };

export default async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  const uri =
    "mongodb+srv://kumararyanbhai90_db_user:2IRWcVTxpF8GbLXe@cluster0.8jnejwp.mongodb.net/dashboard?appName=Cluster0";
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI. Copy .env.example to .env.local and configure MongoDB.",
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 100,
      serverSelectionTimeoutMS: 5000,
    });
  }

  cached.conn = await cached.promise;
  globalForMongoose.mongoose = cached;
  return cached.conn;
}
