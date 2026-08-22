import express from 'express';
import { getInvoicePdf } from '../controllers/invoiceController.js';

const router = express.Router();

router.get('/:invoiceId/pdf', getInvoicePdf);

export default router;
