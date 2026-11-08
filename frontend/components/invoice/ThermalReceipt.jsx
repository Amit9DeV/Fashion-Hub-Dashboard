"use client";

import React from "react";
import { formatMoney, formatDate } from "@/lib/utils";

export default function ThermalReceipt({ invoice, customer, store }) {
  const rawItems = invoice?.items || invoice?.snapshot?.items || [];
  const items = Array.isArray(rawItems) ? rawItems : [];

  const invoiceNumber =
    invoice?.invoiceNumber ||
    invoice?.snapshot?.invoiceNumber ||
    "FH/26-27/000001";

  const issuedDate =
    invoice?.issuedAt ||
    invoice?.snapshot?.issuedAt ||
    invoice?.completedAt ||
    invoice?.date ||
    new Date();

  const formattedDate = new Date(issuedDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const formattedTime = new Date(issuedDate).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const customerName =
    customer?.name ||
    invoice?.customerSnapshot?.name ||
    invoice?.snapshot?.customer?.name ||
    "Walk-in Customer";
  const customerMobile =
    customer?.mobile ||
    customer?.whatsappNumber ||
    invoice?.customerSnapshot?.mobile ||
    invoice?.snapshot?.customer?.mobile ||
    "";

  const storeName = store?.name || store?.storeName || "FASHION HUB";
  const storeTagline = store?.tagline || "Premium Men's & Ethnic Fashion";
  const storeAddress = store?.address || "";
  const storePhone = store?.phone || "";
  const storeGstin = store?.gstin || "";
  const storeUpi = store?.upiId || "";

  const subtotalPaisa =
    invoice?.subtotalPaisa ??
    invoice?.snapshot?.subtotalPaisa ??
    items.reduce((s, i) => s + (i.totalPaisa || (i.quantity || 1) * (i.unitPricePaisa || i.sellingPricePaisa || 0)), 0);

  const discountPaisa =
    invoice?.discountPaisa ?? invoice?.snapshot?.discountPaisa ?? 0;

  const taxPaisa =
    invoice?.taxPaisa ?? invoice?.snapshot?.taxPaisa ?? 0;
  const cgstPaisa =
    invoice?.cgstPaisa ?? invoice?.snapshot?.cgstPaisa ?? Math.round(taxPaisa / 2);
  const sgstPaisa =
    invoice?.sgstPaisa ?? invoice?.snapshot?.sgstPaisa ?? Math.round(taxPaisa / 2);

  const totalPaisa =
    invoice?.totalPaisa ?? invoice?.snapshot?.totalPaisa ?? (subtotalPaisa - discountPaisa);

  const duePaisa =
    invoice?.duePaisa ?? invoice?.snapshot?.duePaisa ?? 0;

  const payments =
    invoice?.payments ||
    invoice?.snapshot?.payments ||
    (invoice?.paymentMethod ? [{ method: invoice.paymentMethod, amountPaisa: totalPaisa }] : []);

  const totalItemsCount = items.length;
  const totalUnitsCount = items.reduce((sum, i) => sum + (i.quantity || 1), 0);

  // UPI QR Code url for payment / verification
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(storeUpi)}&pn=${encodeURIComponent(storeName)}&am=${(totalPaisa / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent(invoiceNumber)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=2&data=${encodeURIComponent(upiPayUrl)}`;

  return (
    <div className="fh-thermal-receipt font-mono text-black bg-white p-4 max-w-[320px] mx-auto border border-[#dfd8cc] shadow-sm select-all">
      {/* ── Store Header ── */}
      <div className="text-center pb-2 border-b border-dashed border-gray-400">
        <h1 className="text-xl font-bold tracking-wider font-serif uppercase">
          {storeName}
        </h1>
        {storeTagline && (
          <p className="text-[10px] tracking-wide text-gray-600 uppercase mt-0.5">
            {storeTagline}
          </p>
        )}
        <p className="text-[10px] text-gray-700 mt-1 leading-tight max-w-[260px] mx-auto">
          {storeAddress}
        </p>
        <p className="text-[11px] font-semibold mt-1">Tel: {storePhone}</p>
        {storeGstin && (
          <p className="text-[10px] tracking-wider text-gray-800">
            GSTIN: {storeGstin}
          </p>
        )}
      </div>

      {/* ── Bill Meta ── */}
      <div className="py-2 border-b border-dashed border-gray-400 text-[11px] space-y-0.5">
        <div className="flex justify-between font-bold">
          <span>INVOICE:</span>
          <span>{invoiceNumber}</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>Date: {formattedDate}</span>
          <span>Time: {formattedTime}</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>Cashier: POS-01</span>
          <span>Type: RETAIL</span>
        </div>
        <div className="pt-1 mt-1 border-t border-dotted border-gray-300">
          <p className="font-semibold text-gray-900 truncate">
            Customer: {customerName}
          </p>
          {customerMobile && (
            <p className="text-gray-700">Mob: {customerMobile}</p>
          )}
        </div>
      </div>

      {/* ── Itemized List ── */}
      <div className="py-2 border-b border-dashed border-gray-400">
        <div className="flex justify-between text-[10px] font-bold text-gray-800 uppercase pb-1 border-b border-gray-300">
          <span className="w-6/12">Item</span>
          <span className="w-2/12 text-center">Qty</span>
          <span className="w-2/12 text-right">Rate</span>
          <span className="w-2/12 text-right">Amt</span>
        </div>

        <div className="divide-y divide-dotted divide-gray-200 py-1">
          {items.map((item, idx) => {
            const name = item.productName || item.name || "Item";
            const variantDetails = [item.size, item.color].filter(Boolean).join("/");
            const qty = item.quantity || 1;
            const unitPrice = item.unitPricePaisa || item.sellingPricePaisa || 0;
            const lineTotal = item.totalPaisa || (qty * unitPrice);

            return (
              <div key={idx} className="py-1 text-[11px]">
                <div className="font-semibold text-gray-900 truncate">
                  {name}
                </div>
                {variantDetails && (
                  <div className="text-[10px] text-gray-500">
                    [{variantDetails}] {item.sku ? `· ${item.sku}` : ""}
                  </div>
                )}
                <div className="flex justify-between text-gray-700 text-[10px] mt-0.5">
                  <span className="w-6/12 text-gray-500"></span>
                  <span className="w-2/12 text-center font-bold text-gray-900">
                    {qty}
                  </span>
                  <span className="w-2/12 text-right">
                    {(unitPrice / 100).toFixed(0)}
                  </span>
                  <span className="w-2/12 text-right font-bold text-gray-900">
                    {(lineTotal / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Financial Summary ── */}
      <div className="py-2 border-b border-dashed border-gray-400 text-[11px] space-y-1">
        <div className="flex justify-between text-gray-700">
          <span>Subtotal ({totalUnitsCount} Units):</span>
          <span>{formatMoney(subtotalPaisa)}</span>
        </div>

        {discountPaisa > 0 && (
          <div className="flex justify-between text-gray-800 font-semibold">
            <span>Special Discount:</span>
            <span>−{formatMoney(discountPaisa)}</span>
          </div>
        )}

        {taxPaisa > 0 && (
          <div className="flex justify-between text-[10px] text-gray-600">
            <span>Taxes (CGST + SGST):</span>
            <span>{formatMoney(taxPaisa)}</span>
          </div>
        )}

        <div className="flex justify-between items-center text-sm font-extrabold border-t border-b border-gray-800 py-1 my-1">
          <span>NET PAYABLE:</span>
          <span className="text-base">{formatMoney(totalPaisa)}</span>
        </div>
      </div>

      {/* ── Payments & Dues ── */}
      <div className="py-2 border-b border-dashed border-gray-400 text-[11px] space-y-0.5">
        <div className="font-bold text-[10px] uppercase text-gray-700">Payment Breakdown:</div>
        {payments.map((p, idx) => (
          <div key={idx} className="flex justify-between text-gray-800">
            <span>Paid via {p.method}:</span>
            <span className="font-semibold">{formatMoney(p.amountPaisa)}</span>
          </div>
        ))}
        {duePaisa > 0 && (
          <div className="flex justify-between text-[#8a1a1a] font-bold border-t border-dotted border-gray-300 pt-1 mt-1">
            <span>Balance Due (Khata):</span>
            <span>{formatMoney(duePaisa)}</span>
          </div>
        )}
      </div>

      {/* ── QR Code for UPI ── */}
      {storeUpi && (
        <div className="py-3 text-center border-b border-dashed border-gray-400">
          <img
            src={qrUrl}
            alt="UPI QR"
            className="size-24 mx-auto border border-gray-300 p-1 bg-white"
          />
          <p className="text-[9px] uppercase font-bold text-gray-700 mt-1">
            Scan to Pay via UPI / GPay / PhonePe
          </p>
          <p className="text-[8px] text-gray-500 font-mono">{storeUpi}</p>
        </div>
      )}

      {/* ── Return Terms & Barcode ── */}
      <div className="pt-2 text-center space-y-1">
        <p className="text-[9px] uppercase font-bold text-gray-900">
          *** THANK YOU FOR SHOPPING! ***
        </p>
        <p className="text-[8px] text-gray-600 leading-tight">
          Exchange allowed within 7 days with intact price tag &amp; bill.
          No cash refund. Items on discount are non-exchangeable.
        </p>
        
        {/* Simulated POS barcode for return scanning */}
        <div className="pt-2">
          <div className="font-mono text-center tracking-[0.25em] text-xs font-bold py-1 bg-gray-100 border border-gray-300">
            *{invoiceNumber}*
          </div>
          <p className="text-[8px] text-gray-400 mt-0.5">Fashion Hub Retail Cloud POS</p>
        </div>
      </div>
    </div>
  );
}

