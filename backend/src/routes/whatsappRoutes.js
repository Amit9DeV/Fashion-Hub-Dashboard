import express from "express";
import { getMessages, retryMessage } from "../controllers/whatsappController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

router.get("/messages", getMessages);
router.post("/retry/:id", retryMessage);

export default router;
