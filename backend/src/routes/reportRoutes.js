import express from "express";
import { getSalesReport } from "../controllers/reportController.js";
import { requireRole } from "../middleware/auth.js";

const router = express.Router();

router.get("/sales", requireRole("ADMIN", "MANAGER"), getSalesReport);

export default router;
