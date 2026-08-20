import React from 'react';

export default function InvoiceHeader() {
  return (
    <div className="flex flex-col items-center pt-10 pb-4 text-center w-full z-10">
      <svg className="w-10 h-10 mb-2" style={{ color: '#C99532' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C9.5 2 8.5 4 8.5 5.5C8.5 6.5 9 7.5 10.5 7.5C12 7.5 12 9 12 9" />
        <path d="M12 9L2.5 14C2 14.3 2 15 2.5 15H21.5C22 15 22 14.3 21.5 14L12 9Z" />
      </svg>
      
      <div className="text-[#C99532] text-2xl font-serif font-bold tracking-widest mb-1">
        FH
      </div>
      
      <div className="text-white text-3xl font-serif tracking-[0.2em] mb-2 mt-1">
        FASHION HUB
      </div>
      
      <div className="text-[#C99532] text-xs tracking-widest uppercase mb-6">
        MEN'S PREMIUM FASHION
      </div>
      
      <div className="w-16 h-[1px] bg-[#C99532] mb-6 opacity-60"></div>
      
      <div className="text-[#D6D6D6] text-sm leading-relaxed max-w-[250px] mb-4 font-sans text-center">
        Main Road Mairwa, Near Nahar Bridge,<br />
        South of HDFC Bank, Mairwa - 841437<br />
        <br />
        +91 82923 99080<br />
        <br />
        GSTIN: 27ABCDE1234F1Z5
      </div>
    </div>
  );
}
