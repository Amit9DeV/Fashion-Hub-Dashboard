import express from 'express';
import { getOrders, deleteOrder, updateOrder, getOrderById, searchOrders } from '../controllers/orderController.js';

const router = express.Router();

router.get('/', getOrders);
router.get('/search', searchOrders);
router.get('/:id', getOrderById);
router.put('/:id', updateOrder);
router.delete('/:id', deleteOrder);

export default router;
