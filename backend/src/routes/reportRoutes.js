import express from "express";
import { getSalesReport } from "../controllers/reportController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

router.get("/sales", getSalesReport);

export default router;
