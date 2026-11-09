import express from 'express';
import { requireRole } from '../middleware/auth.js';
import { getOrders, updateOrder, getOrderById, searchOrders } from '../controllers/orderController.js';

const router = express.Router();

router.get('/', getOrders);
router.get('/search', searchOrders);
router.get('/:id', getOrderById);
router.put('/:id', requireRole("ADMIN", "MANAGER"), updateOrder);

export default router;
