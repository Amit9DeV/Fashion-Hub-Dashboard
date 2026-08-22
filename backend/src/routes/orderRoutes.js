import express from 'express';
import { getOrders, deleteOrder, updateOrder, getOrderById } from '../controllers/orderController.js';

const router = express.Router();

router.get('/', getOrders);
router.get('/:id', getOrderById);
router.put('/:id', updateOrder);
router.delete('/:id', deleteOrder);

export default router;
