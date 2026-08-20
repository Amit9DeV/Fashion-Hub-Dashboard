import React from "react";

export default function InvoiceSummary({ invoice }) {
  const subtotal = invoice?.subtotal || 3398;
  const tax = invoice?.tax || 162;
  const halfTax = tax / 2;
  const total = invoice?.total || 3398; // From user example, subtotal = total = 3398

  return (
    <div className="w-full mb-6 font-sans">
      {/* Subtotal and Tax - Right aligned area */}
      <div className="ml-auto w-[48%] mt-2 mb-4">
        <div className="grid grid-cols-[1fr_100px] items-center text-sm py-1">
          <div className="text-[#D6D6D6] text-right pr-4">Subtotal</div>
          <div className="text-white text-right">
            ₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </div>
        </div>
        <div className="grid grid-cols-[1fr_100px] items-center text-sm py-1">
          <div className="text-[#D6D6D6] text-right pr-4">CGST (2.5%)</div>
          <div className="text-white text-right">
            ₹{halfTax.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </div>
        </div>
        <div className="grid grid-cols-[1fr_100px] items-center text-sm py-1">
          <div className="text-[#D6D6D6] text-right pr-4">SGST (2.5%)</div>
          <div className="text-white text-right">
            ₹{halfTax.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* TOTAL BAR - Full width of invoice-content, Gold Background */}
      <div className="w-full bg-[#C99532] px-[0] py-[12px] mt-2">
        <div className="grid grid-cols-[1fr_100px] items-center">
          <div className="text-black font-bold font-serif tracking-widest uppercase pl-4">
            TOTAL
          </div>
          <div className="text-black font-serif text-2xl font-thin text-right pl-3">
            ₹{total.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
