import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { requestLogger } from "./middleware/logger.js";
import { requireAuth } from "./middleware/auth.js";
import productRoutes from "./routes/productRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import salesRoutes from "./routes/salesRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import returnRoutes from "./routes/returnRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import whatsappRoutes from "./routes/whatsappRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import cashDrawerRoutes from "./routes/cashDrawerRoutes.js";
import purchaseRoutes from "./routes/purchaseRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import authRoutes from "./routes/authRoutes.js";

import CartReservation from "./models/CartReservation.js";
import ProductVariant from "./models/ProductVariant.js";

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://fashion-hub-dashboard.vercel.app",
]
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, ""));

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^https:\/\/fashion-hub-dashboard.*\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(cookieParser()); // Required for reading JWT from HttpOnly cookie
app.use(requestLogger);

// Public root and health routes (no auth required)
app.get("/", (req, res) => {
  res.json({ success: true, message: "Fashion Hub API is running", version: "1.0.0" });
});
app.head("/", (req, res) => {
  res.status(200).end();
});

// Public routes (no auth required)
app.use("/api/auth", authRoutes);

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Backend is running" });
});

// All routes below this require authentication
app.use(requireAuth);

app.use("/api/products", productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/cash-drawer", cashDrawerRoutes);
app.use("/api/purchase", purchaseRoutes);
app.use("/api/cart", cartRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  return res
    .status(500)
    .json({ success: false, message: err.message || "Server error" });
});

// Periodic background job: release expired stock reservations
setInterval(async () => {
  try {
    const expired = await CartReservation.find({
      expiresAt: { $lt: new Date() },
    });
    for (const res of expired) {
      await ProductVariant.updateOne(
        { _id: res.variantId },
        { $inc: { reserved: -res.quantity } },
      );
      await CartReservation.deleteOne({ _id: res._id });
    }
  } catch (error) {
    console.error("Cron Error releasing stock:", error);
  }
}, 60 * 1000); // Check every minute

export default app;
