import { completeSale } from "../services/sales/completeSale.js";
import { updateSale } from "../services/sales/updateSale.js";
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
    return res.status(400).json({
      success: false,
      message: error.message || "Could not complete the sale.",
    });
  }
};

export const updateExistingSale = async (req, res) => {
  try {
    const user = req.user;
    const orderId = req.params.id;
    const result = await updateSale(orderId, req.body, user);

    return res.status(200).json({ 
      success: true, 
      data: result,
      message: "Sale updated successfully."
    });
  } catch (error) {
    console.error("Failed to update sale", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Could not update the sale.",
    });
  }
};
