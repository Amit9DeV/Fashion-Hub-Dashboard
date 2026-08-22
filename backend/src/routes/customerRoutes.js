import express from 'express';
import { searchCustomers, getAllCustomers, getCustomerById } from '../controllers/customerController.js';

const router = express.Router();

router.get('/all', getAllCustomers);
router.get('/:id', getCustomerById);
router.get('/', searchCustomers);

export default router;
