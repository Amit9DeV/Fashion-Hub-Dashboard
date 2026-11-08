"use client";

import React, { useState } from "react";
import { QrCode, X, CheckCircle2, Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { toast } from "sonner";

export function UpiQrModal({
  isOpen,
  onClose,
  amountPaisa,
  upiId = "",
  storeName = "Fashion Hub",
  onPaymentConfirmed,
}) {
  const [copied, setCopied] = useState(false);
  const [customUpi, setCustomUpi] = useState("");

  if (!isOpen) return null;

  const effectiveUpiId = (upiId || customUpi || "").trim();
  const hasUpi = Boolean(effectiveUpiId);
  const amountRupees = (amountPaisa / 100).toFixed(2);
  const upiUrl = hasUpi
    ? `upi://pay?pa=${encodeURIComponent(effectiveUpiId)}&pn=${encodeURIComponent(storeName)}&am=${amountRupees}&cu=INR&tn=Fashion%20Hub%20Bill`
    : "";
  const qrImageSrc = hasUpi
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(upiUrl)}`
    : null;

  const handleCopy = () => {
    if (!effectiveUpiId) return;
    navigator.clipboard?.writeText(effectiveUpiId);
    setCopied(true);
    toast.success("UPI ID copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-[#e8e3da] text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#8a847a] hover:text-[#0b0b0b] p-1 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="size-7 rounded-full bg-[#eef4ff] text-[#1a3a7a] flex items-center justify-center font-bold text-xs">
            <QrCode size={16} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1a3a7a]">
            Instant UPI Payment
          </span>
        </div>

        <p className="text-xs text-[#706a61]">{storeName}</p>

        {/* Amount Display */}
        <div className="my-4 rounded-xl bg-[#faf9f6] border border-[#dfd8cc] py-3 px-4">
          <p className="text-[10px] uppercase font-semibold text-[#8a847a] tracking-wider">
            Total Payable
          </p>
          <p className="font-financial text-3xl font-extrabold text-[#0b0b0b] mt-0.5">
            {formatMoney(amountPaisa)}
          </p>
        </div>

        {/* QR Code Container or UPI configuration prompt */}
        {hasUpi ? (
          <>
            <div className="mx-auto my-3 size-64 rounded-xl border border-[#eee9df] p-2 bg-white shadow-inner flex items-center justify-center">
              <img
                src={qrImageSrc}
                alt="UPI QR Code"
                className="size-full object-contain rounded-lg"
              />
            </div>

            <p className="text-[11px] text-[#706a61] flex items-center justify-center gap-1.5 font-medium">
              <ShieldCheck size={14} className="text-[#1a6b3a]" />
              Scan with GPay, PhonePe, Paytm, or BHIM
            </p>

            {/* UPI ID Pill */}
            <div className="mt-3 flex items-center justify-between rounded-lg bg-[#f5f2ee] px-3 py-1.5 text-xs text-[#5f584e]">
              <span className="font-mono text-[11px] truncate max-w-[200px]">
                {effectiveUpiId}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-semibold text-[#1a3a7a] hover:underline flex items-center gap-1 ml-2 shrink-0"
              >
                <Copy size={12} />
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </>
        ) : (
          <div className="my-6 p-4 rounded-xl border border-[#e8d5b5] bg-[#fffcf5] text-left space-y-3">
            <p className="text-xs font-semibold text-[#8a5a10]">
              Store UPI ID Not Set
            </p>
            <p className="text-[11px] text-[#706a61] leading-relaxed">
              Enter your shop UPI ID below for this bill, or configure it permanently in Store Settings.
            </p>
            <Input
              type="text"
              placeholder="e.g. yourstore@okhdfcbank"
              value={customUpi}
              onChange={(e) => setCustomUpi(e.target.value)}
              className="text-xs h-9 bg-white"
            />
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 text-xs h-9"
          >
            Cancel
          </Button>
          <Button
            variant="gold"
            onClick={() => {
              if (onPaymentConfirmed) onPaymentConfirmed();
              onClose();
            }}
            className="flex-1 text-xs h-9 font-semibold"
          >
            <CheckCircle2 size={14} className="mr-1.5" />
            Paid by UPI
          </Button>
        </div>
      </div>
    </div>
  );
}

