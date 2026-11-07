import React from 'react';

export default function InvoiceHeader({ store }) {
  const storeName = store?.name || "FASHION HUB";
  const tagline = store?.tagline || "MEN'S PREMIUM FASHION";
  const address = store?.address || "Main Road Mairwa, Near Nahar Bridge, South of HDFC Bank, Mairwa - 841437";
  const phone = store?.phone || "+91 82923 99080";
  const gstin = store?.gstin || "27ABCDE1234F1Z5";

  return (
    <div className="flex flex-col items-center pt-8 pb-3 text-center w-full z-10">
      <svg className="w-10 h-10 mb-2" style={{ color: '#C99532' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C9.5 2 8.5 4 8.5 5.5C8.5 6.5 9 7.5 10.5 7.5C12 7.5 12 9 12 9" />
        <path d="M12 9L2.5 14C2 14.3 2 15 2.5 15H21.5C22 15 22 14.3 21.5 14L12 9Z" />
      </svg>
      
      <div className="text-[#C99532] text-xl font-serif font-bold tracking-widest mb-0.5">
        FH
      </div>
      
      <div className="text-white text-2xl sm:text-3xl font-serif tracking-[0.2em] mb-1.5 mt-0.5 uppercase">
        {storeName}
      </div>
      
      <div className="text-[#C99532] text-xs tracking-widest uppercase mb-4">
        {tagline}
      </div>
      
      <div className="w-16 h-[1px] bg-[#C99532] mb-4 opacity-60"></div>
      
      <div className="text-[#D6D6D6] text-xs sm:text-sm leading-relaxed max-w-[320px] mb-3 font-sans text-center">
        {address}<br />
        Tel: {phone}<br />
        {gstin && <span className="font-mono text-[11px] text-[#C99532] mt-0.5 inline-block">GSTIN: {gstin}</span>}
      </div>
    </div>
  );
}
