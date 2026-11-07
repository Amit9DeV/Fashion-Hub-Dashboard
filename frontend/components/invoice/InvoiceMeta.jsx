import React from 'react';

export default function InvoiceMeta({ invoice, customer }) {
  let displayDate = invoice?.date || "";
  let displayTime = invoice?.time || "";

  if (!displayDate) {
    const rawDate = invoice?.issuedAt || invoice?.completedAt || invoice?.createdAt;
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        displayDate = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        displayTime = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
      }
    }
  }

  const custName = customer?.name || invoice?.customerSnapshot?.name || "Walk-in Customer";
  const custMobile = customer?.mobile || invoice?.customerSnapshot?.mobile || "";
  const custGstin = customer?.gstin || invoice?.customerSnapshot?.gstin || "";

  return (
    <div className="w-full mb-6 font-sans">
      <div className="grid grid-cols-[1fr_1px_1fr] gap-[16px] sm:gap-[24px] border-t border-b border-[#C99532]/30 text-sm py-4">
        
        {/* Left Column - Invoice Info */}
        <div className="flex flex-col">
          <div className="text-[#C99532] text-[10px] uppercase tracking-widest font-bold mb-3">
            INVOICE DETAILS
          </div>
          
          <div className="flex flex-col gap-[2px] mb-[8px]">
            <span className="text-[#C99532] text-xs">Invoice No.</span>
            <strong className="text-white font-mono font-medium text-xs sm:text-sm">{invoice?.invoiceNumber || 'FH/26-27/000001'}</strong>
          </div>
          
          {displayDate && (
            <div className="flex flex-col gap-[2px] mb-[8px]">
              <span className="text-[#C99532] text-xs">Date</span>
              <strong className="text-white font-medium text-xs sm:text-sm">{displayDate}</strong>
            </div>
          )}
          
          {displayTime && (
            <div className="flex flex-col gap-[2px]">
              <span className="text-[#C99532] text-xs">Time</span>
              <strong className="text-white font-medium text-xs sm:text-sm">{displayTime}</strong>
            </div>
          )}
        </div>

        {/* Center Divider */}
        <div className="bg-[#C99532]/30 w-[1px] h-full"></div>

        {/* Right Column - Customer Info */}
        <div className="flex flex-col">
          <div className="text-[#C99532] text-[10px] uppercase tracking-widest font-bold mb-3">
            BILLED TO
          </div>

          <div className="flex flex-col gap-[2px] mb-[8px]">
            <span className="text-[#C99532] text-xs">Customer</span>
            <strong className="text-white font-medium text-xs sm:text-sm">{custName}</strong>
          </div>
          
          {custMobile && (
            <div className="flex flex-col gap-[2px] mb-[8px]">
              <span className="text-[#C99532] text-xs">Mobile</span>
              <strong className="text-white font-medium text-xs sm:text-sm">{custMobile}</strong>
            </div>
          )}

          {custGstin && (
            <div className="flex flex-col gap-[2px]">
              <span className="text-[#C99532] text-xs">GSTIN</span>
              <strong className="text-white font-mono text-xs">{custGstin}</strong>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
