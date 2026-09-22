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
} from "../controllers/productController.js";
import { generateBarcodes } from "../controllers/barcodeController.js";

const router = express.Router();

// Specific routes first
router.get("/master", getMasterData);
router.post("/barcodes", generateBarcodes);
router.post("/brands", createBrand);
router.post("/categories", createCategory);
router.get("/all", getAllProducts);
router.post("/", createProduct);
router.get("/:id", getProductById);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.post("/:id/variants", addVariant);
router.put("/:id/variants/:variantId", updateVariant);
router.delete("/:id/variants/:variantId", deleteVariant);

// Catch-all query route
router.get("/", getProducts);

export default router;
