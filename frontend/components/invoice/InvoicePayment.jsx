import React from 'react';

export default function InvoicePayment({ invoice }) {
  let methodString = "";
  let paidAmount = 0;

  if (Array.isArray(invoice?.payments) && invoice.payments.length > 0) {
    methodString = invoice.payments.map(p => p.method).join(" + ");
    paidAmount = invoice.payments.reduce((sum, p) => sum + (p.amountPaisa ? p.amountPaisa / 100 : (p.amount || 0)), 0);
  } else {
    methodString = invoice?.paymentMethod || "UPI";
    paidAmount = invoice?.paymentAmount !== undefined 
      ? invoice.paymentAmount 
      : (invoice?.totalPaisa ? invoice.totalPaisa / 100 : (invoice?.total || 0));
  }

  const dueAmount = invoice?.duePaisa !== undefined 
    ? invoice.duePaisa / 100 
    : (invoice?.due || 0);

  return (
    <div className="w-full mt-3 mb-6 font-sans">
      <div className="border-t border-b border-[#C99532]/20 py-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[#C99532] text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">
              Payment:
            </span>
            <span className="text-white uppercase font-medium">
              {methodString}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#C99532] text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">
              Paid:
            </span>
            <span className="text-white font-mono font-medium">
              ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {dueAmount > 0 && (
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[#C99532]/10 text-[#f59e9e]">
            <span className="text-[11px] uppercase tracking-wider font-semibold">
              Balance Due:
            </span>
            <span className="font-mono font-bold">
              ₹{dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
