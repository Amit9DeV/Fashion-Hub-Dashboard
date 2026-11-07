import express from 'express';
import { requireRole } from '../middleware/auth.js';
import { getOrders, deleteOrder, updateOrder, getOrderById, searchOrders } from '../controllers/orderController.js';

const router = express.Router();

router.get('/', getOrders);
router.get('/search', searchOrders);
router.get('/:id', getOrderById);
router.put('/:id', requireRole("ADMIN", "MANAGER"), updateOrder);
router.delete('/:id', requireRole("ADMIN", "MANAGER"), deleteOrder);

export default router;
