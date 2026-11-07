import express from "express";
import { requireRole } from "../middleware/auth.js";
import {
  createSupplier,
  getSuppliers,
  updateSupplier,
  deleteSupplier,
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  deletePurchaseOrder,
  receivePurchaseOrder,
} from "../controllers/purchaseController.js";

const router = express.Router();
router.use(requireRole("ADMIN", "MANAGER"));

router.post("/suppliers", createSupplier);
router.get("/suppliers", getSuppliers);
router.put("/suppliers/:id", updateSupplier);
router.delete("/suppliers/:id", deleteSupplier);

router.post("/orders", createPurchaseOrder);
router.get("/orders", getPurchaseOrders);
router.get("/orders/:id", getPurchaseOrderById);
router.delete("/orders/:id", deletePurchaseOrder);
router.post("/orders/:id/receive", receivePurchaseOrder);

export default router;
