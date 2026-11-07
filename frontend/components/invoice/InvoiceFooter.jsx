import React from 'react';

export default function InvoiceFooter({ store, invoice }) {
  const footerMessage = store?.invoiceFooter || invoice?.invoiceFooter || "Thank you for shopping with us!";

  return (
    <div className="w-full text-center pb-6 pt-6 mt-auto z-10 relative">
      <div className="text-white text-sm sm:text-[15px] italic font-serif mb-1.5">
        {footerMessage}
      </div>
      <div className="text-[#C99532] text-[10px] sm:text-[11px] tracking-[0.25em] uppercase font-sans font-medium">
        STYLE THAT DEFINES YOU · FASHION HUB
      </div>
    </div>
  );
}
