import express from 'express';
import { processSale, updateExistingSale } from '../controllers/salesController.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/', processSale);
router.put('/:id', requireRole("ADMIN", "MANAGER"), updateExistingSale);

export default router;
