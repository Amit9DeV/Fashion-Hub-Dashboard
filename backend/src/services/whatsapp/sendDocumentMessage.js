export async function sendInvoiceDocument({ phoneNumber, customerName, invoiceNumber, totalPaisa, publicToken }) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!accessToken || !phoneNumberId || !publicAppUrl) {
    throw new Error("WhatsApp Cloud API is not configured. The invoice remains queued for retry.");
  }

  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "fashion_hub_invoice";
  const language = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US";
  const documentUrl = `${publicAppUrl}/api/public/invoices/${publicToken}`;
  const payload = {
    messaging_product: "whatsapp",
    to: phoneNumber.replace(/^\+/, ""),
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      components: [
        { type: "header", parameters: [{ type: "document", document: { link: documentUrl, filename: `${invoiceNumber.replaceAll("/", "-")}.pdf` } }] },
        { type: "body", parameters: [
          { type: "text", text: customerName || "Customer" },
          { type: "text", text: invoiceNumber },
          { type: "text", text: `₹${(totalPaisa / 100).toFixed(2)}` },
        ] },
      ],
    },
  };
  const response = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const responseBody = await response.json();
  if (!response.ok) throw new Error(responseBody?.error?.message || "WhatsApp Cloud API rejected the invoice message.");
  return responseBody.messages?.[0]?.id;
}
