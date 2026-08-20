import express from 'express';
import { processSale } from '../controllers/salesController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', requireAuth, processSale);

export default router;
