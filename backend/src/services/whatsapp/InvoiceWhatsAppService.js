import connectToDatabase from "../../config/db.js";
import Invoice from "../../models/Invoice.js";
import WhatsappMessage from "../../models/WhatsappMessage.js";
import { generateInvoicePdf } from "../../services/invoice/InvoicePDFService.js";
import { sendInvoiceDocument } from "../../services/whatsapp/sendDocumentMessage.js";

/**
 * Deliberately runs after the sale transaction. A PDF or WhatsApp problem is
 * observable and retryable, but can never roll back a completed paid order.
 */
export async function deliverQueuedInvoice(invoiceId) {
  await connectToDatabase();
  const message = await WhatsappMessage.findOne({ invoiceId, type: "INVOICE", status: "QUEUED" }).sort({ createdAt: -1 });
  if (!message) return { status: "not-queued" };

  try {
    const { invoice } = await generateInvoicePdf(invoiceId);
    const invoiceWithToken = await Invoice.findById(invoiceId).select("+publicToken");
    const providerMessageId = await sendInvoiceDocument({
      phoneNumber: message.phoneNumber,
      customerName: invoice.snapshot.customer?.name,
      invoiceNumber: invoice.invoiceNumber,
      totalPaisa: invoice.snapshot.totalPaisa,
      publicToken: invoiceWithToken.publicToken,
    });
    await WhatsappMessage.updateOne({ _id: message._id }, {
      $set: { status: "SENT", providerMessageId, sentAt: new Date(), lastError: undefined },
    });
    return { status: "sent", providerMessageId };
  } catch (error) {
    await WhatsappMessage.updateOne({ _id: message._id }, { $set: { status: "FAILED", lastError: error.message } });
    return { status: "failed", error: error.message };
  }
}
