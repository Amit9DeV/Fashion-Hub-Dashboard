import express from 'express';
import { getOrders, deleteOrder, updateOrder, getOrderById } from '../controllers/orderController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, getOrders);
router.get('/:id', requireAuth, getOrderById);
router.put('/:id', requireAuth, updateOrder);
router.delete('/:id', requireAuth, deleteOrder);

export default router;
