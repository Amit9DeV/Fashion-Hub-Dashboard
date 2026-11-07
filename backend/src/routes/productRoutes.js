import express from "express";
import {
  getProducts,
  getAllProducts,
  getProductById,
  createProduct,
  addVariant,
  updateProduct,
  updateVariant,
  getMasterData,
  deleteProduct,
  deleteVariant,
  createBrand,
  createCategory,
  bulkUpdateVariants,
  getProductMovements,
  getProductSales,
} from "../controllers/productController.js";
import { generateBarcodes } from "../controllers/barcodeController.js";
import { requireRole } from "../middleware/auth.js";

const router = express.Router();

// Specific routes first
router.get("/master", getMasterData);
router.post("/barcodes", requireRole("ADMIN", "MANAGER"), generateBarcodes);
router.post("/brands", requireRole("ADMIN", "MANAGER"), createBrand);
router.post("/categories", requireRole("ADMIN", "MANAGER"), createCategory);
router.post("/variants/bulk-update", requireRole("ADMIN", "MANAGER"), bulkUpdateVariants);
router.get("/all", getAllProducts);
router.post("/", requireRole("ADMIN", "MANAGER"), createProduct);
router.get("/:id/movements", getProductMovements);
router.get("/:id/sales", getProductSales);
router.get("/:id", getProductById);
router.put("/:id", requireRole("ADMIN", "MANAGER"), updateProduct);
router.delete("/:id", requireRole("ADMIN", "MANAGER"), deleteProduct);
router.post("/:id/variants", requireRole("ADMIN", "MANAGER"), addVariant);
router.put("/:id/variants/:variantId", requireRole("ADMIN", "MANAGER"), updateVariant);
router.delete("/:id/variants/:variantId", requireRole("ADMIN", "MANAGER"), deleteVariant);

// Catch-all query route
router.get("/", getProducts);

export default router;
