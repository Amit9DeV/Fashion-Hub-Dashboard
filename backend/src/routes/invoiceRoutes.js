import express from 'express';
import { getInvoicePdf, getInvoice } from '../controllers/invoiceController.js';

const router = express.Router();

router.get('/:invoiceId/pdf', getInvoicePdf);
router.get('/:invoiceId', getInvoice);

export default router;
