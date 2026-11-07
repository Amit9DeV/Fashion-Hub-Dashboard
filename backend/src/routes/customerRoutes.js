import express from 'express';
import { requireRole } from '../middleware/auth.js';
import { 
  searchCustomers, 
  getAllCustomers, 
  getCustomerById, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer,
  settleCustomerDues 
} from '../controllers/customerController.js';

const router = express.Router();

router.get('/all', getAllCustomers);
router.post('/', createCustomer);
router.get('/:id', getCustomerById);
router.put('/:id', requireRole("ADMIN", "MANAGER", "CASHIER"), updateCustomer);
router.delete('/:id', requireRole("ADMIN", "MANAGER"), deleteCustomer);
router.post('/:id/dues/settle', requireRole("ADMIN", "MANAGER", "CASHIER"), settleCustomerDues);
router.get('/', searchCustomers);

export default router;
