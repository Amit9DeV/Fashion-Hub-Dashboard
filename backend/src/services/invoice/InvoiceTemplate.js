import { formatMoney } from "../../utils/utils.js";

/**
 * Invoice presentation is deliberately isolated from sale logic. Replace this
 * placeholder when the final Fashion Hub Option 3 invoice specification lands.
 */
export function buildInvoicePrintModel(snapshot) {
  return {
    brand: snapshot.store?.name || "FASHION HUB",
    tagline: snapshot.store?.tagline || "Premium Men's Fashion",
    invoiceNumber: snapshot.invoiceNumber,
    orderNumber: snapshot.orderNumber,
    issuedAt: new Date(snapshot.issuedAt),
    customer: snapshot.customer,
    rows: snapshot.items.map((item) => ({
      description: [item.productName, item.color, item.size].filter(Boolean).join(" · "),
      sku: item.sku,
      quantity: item.quantity,
      rate: formatMoney(item.unitPricePaisa),
      total: formatMoney(item.totalPaisa),
    })),
    subtotal: formatMoney(snapshot.subtotalPaisa),
    discount: formatMoney(snapshot.discountPaisa),
    tax: formatMoney(snapshot.taxPaisa),
    total: formatMoney(snapshot.totalPaisa),
    payment: snapshot.payments.map((payment) => `${payment.method} ${formatMoney(payment.amountPaisa)}`).join(" · "),
  };
}
