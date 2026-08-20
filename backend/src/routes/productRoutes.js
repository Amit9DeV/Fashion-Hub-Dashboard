import express from 'express';
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
  deleteVariant
} from '../controllers/productController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Specific routes first
router.get('/master', requireAuth, getMasterData);
router.get('/all', requireAuth, getAllProducts);
router.post('/', requireAuth, createProduct);
router.get('/:id', requireAuth, getProductById);
router.put('/:id', requireAuth, updateProduct);
router.delete('/:id', requireAuth, deleteProduct);
router.post('/:id/variants', requireAuth, addVariant);
router.put('/:id/variants/:variantId', requireAuth, updateVariant);
router.delete('/:id/variants/:variantId', requireAuth, deleteVariant);

// Catch-all query route
router.get('/', requireAuth, getProducts);

export default router;
