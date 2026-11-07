import connectToDatabase from "../config/db.js";
import WhatsappMessage from "../models/WhatsappMessage.js";
import Invoice from "../models/Invoice.js";
import Order from "../models/Order.js";
import { deliverQueuedInvoice } from "../services/whatsapp/InvoiceWhatsAppService.js";
import { readInvoicePdf } from "../services/invoice/InvoicePDFService.js";

// @route   GET /api/whatsapp/messages
// @desc    Get all WhatsApp messages
// @access  Private
export const getMessages = async (req, res) => {
  try {
    await connectToDatabase();
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
    await connectToDatabase();
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

// @route   POST /api/whatsapp/send
// @desc    Queue/send a WhatsApp invoice document for an order
// @access  Private
export const sendInvoiceMessage = async (req, res) => {
  try {
    const { orderId, invoiceId, phoneNumber } = req.body;
    await connectToDatabase();

    let invoice = null;
    if (invoiceId) {
      invoice = await Invoice.findById(invoiceId);
    }
    if (!invoice && orderId) {
      invoice = await Invoice.findOne({ orderId });
    }

    let order = null;
    if (!invoice && orderId) {
      order = await Order.findById(orderId);
    }

    if (!invoice && order) {
      try {
        await readInvoicePdf(order._id.toString());
        invoice = await Invoice.findOne({ orderId: order._id });
      } catch (err) {
        console.error("Could not auto-generate invoice for WhatsApp:", err);
      }
    }

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found for this order" });
    }

    const rawPhone = phoneNumber || invoice?.snapshot?.customer?.whatsappNumber || invoice?.snapshot?.customer?.mobile;
    if (!rawPhone || !rawPhone.trim()) {
      return res.status(400).json({ success: false, message: "Recipient mobile number is required" });
    }

    // Clean phone number (strip whitespace, +, -)
    let cleanPhone = rawPhone.replace(/\D/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    let message = await WhatsappMessage.findOne({ invoiceId: invoice._id, type: "INVOICE" });
    if (!message) {
      message = await WhatsappMessage.create({
        orderId: invoice.orderId,
        invoiceId: invoice._id,
        customerId: invoice.customerId,
        phoneNumber: cleanPhone,
        type: "INVOICE",
        status: "QUEUED",
      });
    } else {
      message.phoneNumber = cleanPhone;
      message.status = "QUEUED";
      message.lastError = null;
      await message.save();
    }

    // Attempt delivery in background
    deliverQueuedInvoice(invoice._id.toString()).catch(console.error);

    return res.json({
      success: true,
      message: `WhatsApp invoice queued for ${cleanPhone}`,
      data: message,
    });
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to send WhatsApp message" });
  }
};

// @route   POST /api/whatsapp/send-custom
// @desc    Send custom WhatsApp message or dues payment reminder
// @access  Private
export const sendCustomMessage = async (req, res) => {
  try {
    const { customerId, phoneNumber, messageText, type = "REMINDER" } = req.body;
    if (!phoneNumber || !messageText) {
      return res.status(400).json({ success: false, message: "Phone number and message text are required" });
    }

    await connectToDatabase();

    let cleanPhone = String(phoneNumber).replace(/\D/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const message = await WhatsappMessage.create({
      customerId: customerId || undefined,
      phoneNumber: cleanPhone,
      type: ["REMINDER", "MARKETING", "CUSTOM"].includes(type) ? type : "CUSTOM",
      category: type === "MARKETING" ? "MARKETING" : "TRANSACTIONAL",
      messageBody: messageText,
      status: "QUEUED",
      queuedAt: new Date(),
    });

    const waWebUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

    return res.json({
      success: true,
      message: `WhatsApp message queued for ${cleanPhone}`,
      data: {
        message,
        waWebUrl,
      },
    });
  } catch (error) {
    console.error("Failed to queue custom WhatsApp message:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to process message" });
  }
};
