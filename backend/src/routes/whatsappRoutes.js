import express from "express";
import { getMessages, retryMessage, sendInvoiceMessage, sendCustomMessage } from "../controllers/whatsappController.js";
import { requireRole } from "../middleware/auth.js";

const router = express.Router();

// Allow cashiers as well as admin/manager to send invoice WhatsApp messages after a sale
router.post("/send", requireRole("ADMIN", "MANAGER", "CASHIER"), sendInvoiceMessage);

// Admin, Manager, and Cashier can send customer dues reminders and custom messages
router.post("/send-custom", requireRole("ADMIN", "MANAGER", "CASHIER"), sendCustomMessage);

// Admin & Manager routes for viewing message logs and retrying failed queue items
router.get("/messages", requireRole("ADMIN", "MANAGER"), getMessages);
router.post("/retry/:id", requireRole("ADMIN", "MANAGER"), retryMessage);

export default router;
