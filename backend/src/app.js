import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import { requestLogger } from "./middleware/logger.js";
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
      if (!origin || allowedOrigins.includes(origin)) {
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
app.use(requestLogger);

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

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Backend is running" });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  return res.status(500).json({ success: false, message: err.message || "Server error" });
});

export default app;
