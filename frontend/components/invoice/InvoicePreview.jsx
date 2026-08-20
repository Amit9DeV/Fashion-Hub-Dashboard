"use client";

import React from 'react';
import { Download, Printer, MessageCircle } from 'lucide-react';
import FashionHubInvoice from './FashionHubInvoice';

export default function InvoicePreview({ invoice, store, customer }) {
  return (
    <div className="min-h-screen bg-[#EDEBE6] py-10 print:py-0 print:bg-white flex flex-col items-center">
      
      {/* Preview Controls (Hidden in Print) */}
      <div className="no-print flex gap-4 mb-6">
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-white text-black border border-[#E5E0D6] hover:border-black px-4 py-2 text-sm font-semibold transition-colors rounded-sm"
        >
          <Printer size={16} /> Print
        </button>
        <button className="flex items-center gap-2 bg-black text-white px-4 py-2 text-sm font-semibold rounded-sm hover:bg-gray-800 transition-colors">
          <Download size={16} /> Download PDF
        </button>
        <button className="flex items-center gap-2 bg-[#1E8E3E] text-white px-4 py-2 text-sm font-semibold rounded-sm hover:bg-[#156E2F] transition-colors">
          <MessageCircle size={16} /> Send WhatsApp
        </button>
      </div>

      {/* Actual Invoice Wrapper */}
      <FashionHubInvoice invoice={invoice} store={store} customer={customer} />
      
    </div>
  );
}
