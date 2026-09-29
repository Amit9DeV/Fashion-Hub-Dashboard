import express from 'express';
import { getStaff, createStaff, updateStaff } from '../controllers/staffController.js';

const router = express.Router();

router.get('/', getStaff);
router.post('/', createStaff);
router.put('/:id', updateStaff);

export default router;
