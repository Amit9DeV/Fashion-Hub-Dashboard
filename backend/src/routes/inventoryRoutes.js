import express from 'express';
import { getInventory } from '../controllers/inventoryController.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireRole("ADMIN", "MANAGER"), getInventory);

export default router;
