import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import http from 'http';
import mongoose from 'mongoose';
import app from './app.js';
import connectToDatabase, { assertTransactionSupport } from './config/db.js';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// ─── Start server only after DB connects successfully ─────────────────────────
connectToDatabase()
  .then(() => {
    console.log("✅  MongoDB connected");
    if (process.env.NODE_ENV === "production") assertTransactionSupport();

    // ─── Start background job AFTER DB is ready ──────────────────────────────
    server.listen(PORT, () => {
      console.log(`🚀  Backend server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌  MongoDB connection failed:", err.message);
    process.exit(1); // Do not start a server with no database
  });

// ─── Graceful shutdown ────────────────────────────────────────────────────────
process.on("SIGTERM", () => {
  console.log("SIGTERM received — shutting down gracefully");
  shutdown();
});

process.on("SIGINT", () => {
  console.log("SIGINT received — shutting down gracefully");
  shutdown();
});

function shutdown() {
  const forceExit = setTimeout(() => {
    server.closeAllConnections?.();
    process.exit(1);
  }, 10000);
  forceExit.unref();
  server.close(async () => {
    clearTimeout(forceExit);
    await mongoose.disconnect().catch((error) => console.error("MongoDB disconnect error:", error.message));
    process.exit(0);
  });
}
