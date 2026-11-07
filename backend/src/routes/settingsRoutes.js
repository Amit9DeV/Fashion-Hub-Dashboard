import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getSettings);
router.post('/', requireRole("ADMIN"), updateSettings);

export default router;
