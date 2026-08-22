import express from "express";
import { getMessages, retryMessage } from "../controllers/whatsappController.js";

const router = express.Router();

router.get("/messages", getMessages);
router.post("/retry/:id", retryMessage);

export default router;
