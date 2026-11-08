import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import http from 'http';
import app from './app.js';
import connectToDatabase from './config/db.js';
import CartReservation from './models/CartReservation.js';
import ProductVariant from './models/ProductVariant.js';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// ─── Start server only after DB connects successfully ─────────────────────────
connectToDatabase()
  .then(() => {
    console.log("✅  MongoDB connected");

    // ─── Start background job AFTER DB is ready ──────────────────────────────
    startCartCleanupJob();

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
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received — shutting down gracefully");
  server.close(() => process.exit(0));
});

// ─── Cart reservation cleanup (runs only after DB is connected) ───────────────
function startCartCleanupJob() {
  setInterval(async () => {
    try {
      const expired = await CartReservation.find({
        expiresAt: { $lt: new Date() },
      });
      for (const reservation of expired) {
        await ProductVariant.updateOne(
          { _id: reservation.variantId },
          { $inc: { reserved: -reservation.quantity } }
        );
        await CartReservation.deleteOne({ _id: reservation._id });
      }
    } catch (error) {
      console.error("Cart cleanup job error:", error.message);
    }
  }, 60 * 1000);
}
