import express from 'express';
import { searchCustomers, getAllCustomers, getCustomerById } from '../controllers/customerController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/all', requireAuth, getAllCustomers);
router.get('/:id', requireAuth, getCustomerById);
router.get('/', requireAuth, searchCustomers);

export default router;
