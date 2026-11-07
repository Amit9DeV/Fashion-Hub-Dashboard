import React from "react";
import InvoiceHeader from "./InvoiceHeader";
import InvoiceMeta from "./InvoiceMeta";
import InvoiceItems from "./InvoiceItems";
import InvoiceSummary from "./InvoiceSummary";
import InvoicePayment from "./InvoicePayment";
import InvoiceTrustFeatures from "./InvoiceTrustFeatures";
import InvoiceFooter from "./InvoiceFooter";
import "./invoice.css";

export default function FashionHubInvoice({ invoice, customer, store, theme = "dark" }) {
  // Normalize items array
  const rawItems = invoice?.items || invoice?.snapshot?.items || [];
  const items = Array.isArray(rawItems) ? rawItems : [];

  const invoiceData = {
    invoiceNumber: invoice?.invoiceNumber || invoice?.snapshot?.invoiceNumber || "FH/26-27/000001",
    date: invoice?.date,
    time: invoice?.time,
    issuedAt: invoice?.issuedAt || invoice?.snapshot?.issuedAt || invoice?.completedAt,
    items,
    subtotalPaisa: invoice?.subtotalPaisa ?? invoice?.snapshot?.subtotalPaisa,
    subtotal: invoice?.subtotal ?? invoice?.snapshot?.subtotal,
    taxPaisa: invoice?.taxPaisa ?? invoice?.snapshot?.taxPaisa,
    tax: invoice?.tax ?? invoice?.snapshot?.tax,
    cgstPaisa: invoice?.cgstPaisa ?? invoice?.snapshot?.cgstPaisa,
    sgstPaisa: invoice?.sgstPaisa ?? invoice?.snapshot?.sgstPaisa,
    discountPaisa: invoice?.discountPaisa ?? invoice?.snapshot?.discountPaisa,
    discount: invoice?.discount ?? invoice?.snapshot?.discount,
    totalPaisa: invoice?.totalPaisa ?? invoice?.snapshot?.totalPaisa,
    total: invoice?.total ?? invoice?.snapshot?.total,
    duePaisa: invoice?.duePaisa ?? invoice?.snapshot?.duePaisa,
    due: invoice?.due ?? invoice?.snapshot?.due,
    payments: invoice?.payments || invoice?.snapshot?.payments,
    paymentMethod: invoice?.paymentMethod || invoice?.snapshot?.paymentMethod,
    paymentAmount: invoice?.paymentAmount || invoice?.snapshot?.paymentAmount,
  };

  const customerData = customer || invoice?.customer || invoice?.snapshot?.customer || invoice?.customerSnapshot || {
    name: "Walk-in Customer",
  };

  const storeData = store || invoice?.store || invoice?.snapshot?.store;

  return (
    <div className={`fh-invoice-container fh-printable ${theme === "light" ? "fh-theme-light" : ""}`}>
      {/* Decorative Borders */}
      <div className="fh-outer-border"></div>
      <div className="fh-inner-border"></div>
      <div className="fh-corner fh-corner-tl"></div>
      <div className="fh-corner fh-corner-tr"></div>
      <div className="fh-corner fh-corner-bl"></div>
      <div className="fh-corner fh-corner-br"></div>

      <InvoiceHeader store={storeData} />

      {/* Invoice Title */}
      <div className="w-full flex items-center justify-center mt-2 mb-6 z-10">
        <div className="text-[#C99532] font-serif text-lg sm:text-xl tracking-[0.3em] flex items-center gap-3">
          <span className="opacity-90">✨</span>
          <span className="font-bold pl-[0.3em]">TAX INVOICE</span>
          <span className="opacity-90">✨</span>
        </div>
      </div>

      <div className="invoice-content z-10 relative">
        <InvoiceMeta invoice={invoiceData} customer={customerData} />
        <InvoiceItems items={items} />
        <InvoiceSummary invoice={invoiceData} />
        <InvoicePayment invoice={invoiceData} />
        <InvoiceTrustFeatures />
      </div>

      <InvoiceFooter store={storeData} invoice={invoiceData} />
    </div>
  );
}
