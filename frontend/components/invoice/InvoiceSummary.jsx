import React from "react";

export default function InvoiceSummary({ invoice }) {
  const subtotal = invoice?.subtotalPaisa !== undefined 
    ? invoice.subtotalPaisa / 100 
    : (invoice?.subtotal || 0);

  const discount = invoice?.discountPaisa !== undefined 
    ? invoice.discountPaisa / 100 
    : (invoice?.discount || 0);

  const tax = invoice?.taxPaisa !== undefined 
    ? invoice.taxPaisa / 100 
    : (invoice?.tax || 0);

  const cgst = invoice?.cgstPaisa !== undefined 
    ? invoice.cgstPaisa / 100 
    : (tax > 0 ? tax / 2 : 0);

  const sgst = invoice?.sgstPaisa !== undefined 
    ? invoice.sgstPaisa / 100 
    : (tax > 0 ? tax / 2 : 0);

  const total = invoice?.totalPaisa !== undefined 
    ? invoice.totalPaisa / 100 
    : (invoice?.total || (subtotal - discount));

  return (
    <div className="w-full mb-6 font-sans">
      {/* Subtotal, Discount and Tax - Right aligned area */}
      <div className="ml-auto w-full sm:w-[55%] md:w-[48%] mt-2 mb-4 space-y-1">
        <div className="grid grid-cols-[1fr_110px] items-center text-xs sm:text-sm py-1">
          <div className="text-[#D6D6D6] text-right pr-4">Subtotal</div>
          <div className="text-white text-right font-mono">
            ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
        </div>

        {discount > 0 && (
          <div className="grid grid-cols-[1fr_110px] items-center text-xs sm:text-sm py-1 text-[#7ecb75]">
            <div className="text-right pr-4">Bill Discount</div>
            <div className="text-right font-mono font-medium">
              −₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </div>
          </div>
        )}

        {tax > 0 && (
          <>
            <div className="grid grid-cols-[1fr_110px] items-center text-xs sm:text-sm py-0.5">
              <div className="text-[#D6D6D6] text-right pr-4">CGST (2.5%)</div>
              <div className="text-white text-right font-mono">
                ₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="grid grid-cols-[1fr_110px] items-center text-xs sm:text-sm py-0.5">
              <div className="text-[#D6D6D6] text-right pr-4">SGST (2.5%)</div>
              <div className="text-white text-right font-mono">
                ₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* TOTAL BAR - Full width of invoice-content, Gold Background */}
      <div className="w-full bg-[#C99532] px-4 py-3 mt-2 rounded-xs">
        <div className="grid grid-cols-[1fr_auto] items-center">
          <div className="text-black font-bold font-serif tracking-widest uppercase text-sm sm:text-base">
            GRAND TOTAL
          </div>
          <div className="text-black font-serif text-xl sm:text-2xl font-bold text-right font-mono">
            ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>
  );
}
