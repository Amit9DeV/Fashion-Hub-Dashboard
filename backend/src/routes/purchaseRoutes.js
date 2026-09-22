import express from "express";
import { createSupplier, getSuppliers, createPurchaseOrder, receivePurchaseOrder } from "../controllers/purchaseController.js";

const router = express.Router();

router.post("/suppliers", createSupplier);
router.get("/suppliers", getSuppliers);
router.post("/orders", createPurchaseOrder);
router.post("/orders/:id/receive", receivePurchaseOrder);

export default router;
