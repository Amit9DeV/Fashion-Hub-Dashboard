import express from 'express';
import { getStaff } from '../controllers/staffController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, getStaff);

export default router;
