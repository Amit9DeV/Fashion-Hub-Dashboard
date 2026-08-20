import WhatsappMessage from "../models/WhatsappMessage.js";
import { deliverQueuedInvoice } from "../services/whatsapp/InvoiceWhatsAppService.js";

// @route   GET /api/whatsapp/messages
// @desc    Get all WhatsApp messages
// @access  Private
export const getMessages = async (req, res) => {
  try {
    const messages = await WhatsappMessage.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

// @route   POST /api/whatsapp/retry/:id
// @desc    Retry a failed WhatsApp message
// @access  Private
export const retryMessage = async (req, res) => {
  try {
    const message = await WhatsappMessage.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, error: "Message not found" });
    }

    if (message.status === "SENT") {
      return res.status(400).json({ success: false, error: "Message is already sent" });
    }

    // Set to QUEUED and trigger delivery
    message.status = "QUEUED";
    message.lastError = null;
    await message.save();

    // Trigger the background service
    deliverQueuedInvoice(message.invoiceId.toString()).catch(console.error);

    res.json({ success: true, message: "Message queued for retry", data: message });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
};
