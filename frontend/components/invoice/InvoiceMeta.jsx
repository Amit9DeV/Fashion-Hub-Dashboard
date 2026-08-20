import React from 'react';

export default function InvoiceMeta({ invoice, customer }) {
  return (
    <div className="w-full mb-8 font-sans">
      <div className="grid grid-cols-[1fr_1px_1fr] gap-[24px] border-t border-b border-[#C99532]/30 text-sm py-4">
        
        {/* Left Column - Invoice Info */}
        <div className="flex flex-col">
          <div className="text-[#C99532] text-[10px] uppercase tracking-widest font-bold mb-4">
            INVOICE INFORMATION
          </div>
          
          <div className="flex flex-col gap-[3px] mb-[9px]">
            <span className="text-[#C99532] text-xs">Invoice No.</span>
            <strong className="text-white font-medium text-sm">{invoice?.invoiceNumber || 'FH/26-27/000011'}</strong>
          </div>
          
          <div className="flex flex-col gap-[3px] mb-[9px]">
            <span className="text-[#C99532] text-xs">Date</span>
            <strong className="text-white font-medium text-sm">{invoice?.date || '18 Aug 2026'}</strong>
          </div>
          
          <div className="flex flex-col gap-[3px] mb-[9px]">
            <span className="text-[#C99532] text-xs">Time</span>
            <strong className="text-white font-medium text-sm">{invoice?.time || '09:17 PM'}</strong>
          </div>
        </div>

        {/* Center Divider */}
        <div className="bg-[#C99532]/30 w-[1px] h-full"></div>

        {/* Right Column - Customer Info */}
        <div className="flex flex-col">
          <div className="text-[#C99532] text-[10px] uppercase tracking-widest font-bold mb-4">
            CUSTOMER INFORMATION
          </div>

          <div className="flex flex-col gap-[3px] mb-[9px]">
            <span className="text-[#C99532] text-xs">Customer</span>
            <strong className="text-white font-medium text-sm">{customer?.name || 'Amit Jee'}</strong>
          </div>
          
          {customer?.mobile && (
            <div className="flex flex-col gap-[3px] mb-[9px]">
              <span className="text-[#C99532] text-xs">Mobile</span>
              <strong className="text-white font-medium text-sm">{customer.mobile}</strong>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
