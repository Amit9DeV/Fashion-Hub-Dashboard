import express from "express";
import { getSalesReport } from "../controllers/reportController.js";

const router = express.Router();

router.get("/sales", getSalesReport);

export default router;
