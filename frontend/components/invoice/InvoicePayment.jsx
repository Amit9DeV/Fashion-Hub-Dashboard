import React from 'react';

export default function InvoicePayment({ invoice }) {
  const method = invoice?.paymentMethod || 'UPI';
  const amount = invoice?.paymentAmount || invoice?.total || 3398;

  return (
    <div className="w-full mt-4 mb-6 font-sans">
      <div className="grid grid-cols-[100px_1fr_100px_100px] items-center gap-0 border-t border-b border-[#C99532]/20 py-4">
        
        <div className="text-[#C99532] text-[11px] uppercase tracking-wider text-left">
          Payment Method
        </div>
        
        <div className="text-white text-sm uppercase pl-4">
          {method}
        </div>
        
        <div className="text-[#C99532] text-[11px] uppercase tracking-wider text-right pr-4">
          Amount Paid
        </div>
        
        <div className="text-white text-sm font-medium text-right">
          ₹{amount.toLocaleString()}
        </div>
        
      </div>
    </div>
  );
}
