import { completeSale } from "../services/sales/completeSale.js";
import { generateInvoicePdf } from "../services/invoice/InvoicePDFService.js";
import { deliverQueuedInvoice } from "../services/whatsapp/InvoiceWhatsAppService.js";

export const processSale = async (req, res) => {
  try {
    const user = req.user;
    const result = await completeSale(req.body, user);

    let postSaleWarning;
    try {
      if (result.whatsappMessageId) {
        const delivery = await deliverQueuedInvoice(result.invoiceId);
        if (delivery.status === "failed") {
          postSaleWarning = "The sale is complete, but WhatsApp delivery failed and can be retried from Orders.";
        }
      } else {
        await generateInvoicePdf(result.invoiceId);
      }
    } catch (postSaleError) {
      console.error("Invoice post-sale task failed", postSaleError);
      postSaleWarning = "The sale is complete, but the invoice file needs a retry.";
    }

    return res.status(201).json({ 
      success: true, 
      data: { ...result, postSaleWarning },
      message: "Sale completed and inventory updated."
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not complete the sale." });
  }
};
