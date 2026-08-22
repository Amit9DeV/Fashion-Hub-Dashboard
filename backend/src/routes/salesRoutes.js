import express from 'express';
import { processSale } from '../controllers/salesController.js';

const router = express.Router();

router.post('/', processSale);

export default router;
