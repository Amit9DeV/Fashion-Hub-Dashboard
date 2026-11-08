import mongoose from "mongoose";
import connectToDatabase from "../config/db.js";
import Invoice from "../models/Invoice.js";
import Order from "../models/Order.js";
import Settings from "../models/Settings.js";
import { STORE } from "../utils/store.js";
import { readInvoicePdf } from "../services/invoice/InvoicePDFService.js";

export const getInvoicePdf = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const pdf = await readInvoicePdf(invoiceId);
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=Fashion-Hub-Invoice.pdf");
    res.setHeader("Cache-Control", "private, max-age=0");
    
    return res.send(pdf);
  } catch (error) {
    console.error(error);
    return res.status(404).json({ success: false, message: error.message || "Could not generate the invoice PDF." });
  }
};

export const getPublicInvoicePdf = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required." });
    }
    await connectToDatabase();
    const invoice = await Invoice.findOne({ publicToken: token }).select("+publicToken");
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }
    const pdf = await readInvoicePdf(invoice._id.toString());
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=Fashion-Hub-${invoice.invoiceNumber.replaceAll("/", "-")}.pdf`);
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(pdf);
  } catch (error) {
    console.error(error);
    return res.status(404).json({ success: false, message: error.message || "Invoice PDF could not be loaded." });
  }
};

export const getInvoice = async (req, res) => {
  try {
    await connectToDatabase();
    const { invoiceId } = req.params;
    let invoice = null;

    if (mongoose.Types.ObjectId.isValid(invoiceId)) {
      invoice = await Invoice.findById(invoiceId).lean();
      if (!invoice) {
        invoice = await Invoice.findOne({ orderId: invoiceId }).lean();
      }
    }
    if (!invoice) {
      invoice = await Invoice.findOne({ invoiceNumber: invoiceId }).lean();
    }

    let order = null;
    if (!invoice) {
      if (mongoose.Types.ObjectId.isValid(invoiceId)) {
        order = await Order.findById(invoiceId).lean();
      }
      if (!order) {
        order = await Order.findOne({ invoiceNumber: invoiceId }).lean();
      }
      if (order) {
        // Trigger generation to ensure Invoice document exists
        try {
          await readInvoicePdf(order._id.toString());
          invoice = await Invoice.findOne({ orderId: order._id }).lean();
        } catch {
          // If PDF generation encounters minor issue, we still construct snapshot
        }
      }
    }

    if (!invoice && !order) {
      return res.status(404).json({ success: false, message: "Invoice or Order not found." });
    }

    const settings = await Settings.findOne().lean();
    const store = {
      ...STORE,
      name: settings?.storeName || STORE.name,
      tagline: settings?.tagline || STORE.tagline,
      gstin: settings?.gstin || STORE.gstin,
      taxRate: settings?.taxRate || 5,
      invoiceFooter: settings?.invoiceFooter || "Thank you for shopping with us!",
      phone: settings?.phone || STORE.phone,
      address: settings?.address || STORE.address,
      upiId: settings?.upiId || "",
    };

    const snapshot = invoice?.snapshot || {
      invoiceNumber: order.invoiceNumber,
      orderNumber: order.orderNumber,
      issuedAt: order.completedAt,
      items: order.items,
      subtotalPaisa: order.subtotalPaisa,
      discountPaisa: order.discountPaisa || 0,
      taxPaisa: order.taxPaisa || 0,
      cgstPaisa: order.cgstPaisa || 0,
      sgstPaisa: order.sgstPaisa || 0,
      totalPaisa: order.totalPaisa,
      duePaisa: order.duePaisa || 0,
      payments: order.payments,
      customer: order.customerSnapshot,
    };

    return res.json({
      success: true,
      data: {
        invoice: invoice || { _id: order._id, invoiceNumber: order.invoiceNumber, snapshot },
        snapshot,
        customer: snapshot.customer || null,
        store,
      },
    });
  } catch (error) {
    console.error("Failed to get invoice:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to load invoice." });
  }
};
