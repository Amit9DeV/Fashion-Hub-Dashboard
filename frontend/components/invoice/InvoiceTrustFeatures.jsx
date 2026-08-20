import React from 'react';

export default function InvoiceTrustFeatures() {
  return (
    <div className="w-full py-4 mt-2">
      <div className="grid grid-cols-[1fr_1px_1fr_1px_1fr] items-center">
        
        {/* Feature 1 */}
        <div className="flex flex-col items-center justify-center text-center px-2">
          <svg className="w-6 h-6 mb-2 text-[#C99532]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div className="text-white font-bold text-[8px] uppercase tracking-wider mb-0.5">100% Original</div>
          <div className="text-[#D6D6D6] text-[7px] uppercase tracking-wider">Products</div>
        </div>
        
        {/* Divider 1 */}
        <div className="bg-transparent h-10 border-l border-[#C99532]/20 w-px mx-auto"></div>

        {/* Feature 2 */}
        <div className="flex flex-col items-center justify-center text-center px-2">
          <svg className="w-6 h-6 mb-2 text-[#C99532]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <div className="text-white font-bold text-[8px] uppercase tracking-wider mb-0.5">Easy Exchange</div>
          <div className="text-[#D6D6D6] text-[7px] uppercase tracking-wider">Within 7 Days</div>
        </div>

        {/* Divider 2 */}
        <div className="bg-transparent h-10 border-l border-[#C99532]/20 w-px mx-auto"></div>

        {/* Feature 3 */}
        <div className="flex flex-col items-center justify-center text-center px-2">
          <svg className="w-6 h-6 mb-2 text-[#C99532]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
          </svg>
          <div className="text-white font-bold text-[8px] uppercase tracking-wider mb-0.5">Premium Quality</div>
          <div className="text-[#D6D6D6] text-[7px] uppercase tracking-wider">Assured</div>
        </div>

      </div>
    </div>
  );
}
