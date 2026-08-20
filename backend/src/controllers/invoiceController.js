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
