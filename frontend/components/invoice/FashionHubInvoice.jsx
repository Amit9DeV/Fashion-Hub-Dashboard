import React from "react";
import InvoiceHeader from "./InvoiceHeader";
import InvoiceMeta from "./InvoiceMeta";
import InvoiceItems from "./InvoiceItems";
import InvoiceSummary from "./InvoiceSummary";
import InvoicePayment from "./InvoicePayment";
import InvoiceTrustFeatures from "./InvoiceTrustFeatures";
import InvoiceFooter from "./InvoiceFooter";
import "./invoice.css";

export default function FashionHubInvoice({ invoice, customer }) {
  const invoiceData = invoice || {
    invoiceNumber: "FH/26-27/000011",
    date: "18 Aug 2026",
    time: "09:17 PM",
    items: [
      {
        name: "Signature Piqué Polo",
        sku: "FH-POLO-CREAM-L",
        size: "L",
        color: "Cream",
        qty: 1,
        rate: 1499,
        amount: 1499,
      },
      {
        name: "Peter England Formal Shirt",
        sku: "FH-SHIRT-WHT-M",
        size: "M",
        color: "White",
        qty: 1,
        rate: 1899,
        amount: 1899,
      },
    ],
    subtotal: 3398,
    tax: 162,
    total: 3398,
    paymentMethod: "UPI",
    paymentAmount: 3398,
  };

  const customerData = customer || {
    name: "Amit Jee",
    mobile: "9334135467",
  };

  return (
    <div className="fh-invoice-container">
      {/* Decorative Borders */}
      <div className="fh-outer-border"></div>
      <div className="fh-inner-border"></div>
      <div className="fh-corner fh-corner-tl"></div>
      <div className="fh-corner fh-corner-tr"></div>
      <div className="fh-corner fh-corner-bl"></div>
      <div className="fh-corner fh-corner-br"></div>

      <InvoiceHeader />

      {/* Invoice Title */}
      <div className="w-full flex items-center justify-center mt-4 mb-8 z-10">
        <div className="text-[#C99532] font-serif text-xl tracking-[0.3em] flex items-center gap-4">
          <span className="opacity-90">✨</span>
          <span className="font-bold pl-[0.3em]">INVOICE</span>
          <span className="opacity-90">✨</span>
        </div>
      </div>

      <div className="invoice-content z-10 relative">
        <InvoiceMeta invoice={invoiceData} customer={customerData} />
        <InvoiceItems items={invoiceData.items} />
        <InvoiceSummary invoice={invoiceData} />
        <InvoicePayment invoice={invoiceData} />
        <InvoiceTrustFeatures />
      </div>

      <InvoiceFooter />
    </div>
  );
}
