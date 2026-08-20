import express from 'express';
import { getInvoicePdf } from '../controllers/invoiceController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/:invoiceId/pdf', requireAuth, getInvoicePdf);

export default router;
