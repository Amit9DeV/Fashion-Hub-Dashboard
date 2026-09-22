import express from 'express';
import { searchCustomers, getAllCustomers, getCustomerById, updateCustomer, deleteCustomer } from '../controllers/customerController.js';

const router = express.Router();

router.get('/all', getAllCustomers);
router.get('/:id', getCustomerById);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.get('/', searchCustomers);

export default router;
