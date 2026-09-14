import express from 'express';
import { processSale, updateExistingSale } from '../controllers/salesController.js';

const router = express.Router();

router.post('/', processSale);
router.put('/:id', updateExistingSale);

export default router;
