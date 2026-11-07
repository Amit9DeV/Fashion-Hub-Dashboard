import dotenv from "dotenv";
dotenv.config();

// ─── Validate required env vars before anything else loads ────────────────────
const REQUIRED_ENV = ["MONGODB_URI", "AUTH_SECRET"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`\n❌  FATAL: Missing required environment variable: ${key}`);
    console.error(`   Copy .env.example to .env and fill in the values.\n`);
    process.exit(1);
  }
}

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

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

const app = express();

// ─── Trust proxy (Render / Railway) ──────────────────────────────────────────
app.set("trust proxy", 1);

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin asset fetching
    contentSecurityPolicy: false,                          // API-only server, no HTML served
  })
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
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
    allowedHeaders: ["Content-Type", "Authorization", "idempotency-key", "Idempotency-Key", "x-requested-with"],
  })
);

// ─── Body parsing (with size limit to prevent DoS) ────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(requestLogger);

// ─── Global rate limiter (all routes) ────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,                  // 500 requests per window per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
  skip: (req) => process.env.NODE_ENV === "development",
});
app.use(globalLimiter);

// ─── Public root and health routes ───────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ success: true, message: "Fashion Hub API is running", version: "1.0.0" });
});
app.head("/", (req, res) => {
  res.status(200).end();
});
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Backend is running", timestamp: new Date().toISOString() });
});

// ─── Public auth routes ───────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);

// ─── Protected routes ─────────────────────────────────────────────────────────
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

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);
  if (!isProd) console.error(err.stack);
  if (res.headersSent) return next(err);
  return res.status(status).json({
    success: false,
    message: isProd && status === 500 ? "An internal error occurred." : (err.message || "Server error"),
  });
});

export default app;
