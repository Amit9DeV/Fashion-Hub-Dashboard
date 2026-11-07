import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', requireRole("ADMIN", "MANAGER"), getDashboardStats);

export default router;
