import React from 'react';

export default function InvoiceItems({ items = [] }) {
  const defaultItems = [
    { name: 'Signature Piqué Polo', sku: 'FH-POLO-CREAM-L', size: 'L', color: 'Cream', qty: 1, rate: 1499, amount: 1499 },
    { name: 'Peter England Formal Shirt', sku: 'FH-SHIRT-WHT-M', size: 'M', color: 'White', qty: 1, rate: 1899, amount: 1899 }
  ];

  const displayItems = items.length > 0 ? items : defaultItems;

  return (
    <div className="w-full mb-6 font-sans">
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_45px_90px_100px] gap-0 border-b border-[#C99532]/30 pb-2 mb-2 text-[#C99532] font-medium text-xs uppercase tracking-wider">
        <div className="text-left">ITEM</div>
        <div className="text-right">QTY</div>
        <div className="text-right">RATE</div>
        <div className="text-right">AMOUNT</div>
      </div>

      {/* Rows */}
      <div className="flex flex-col">
        {displayItems.map((item, index) => (
          <div 
            key={index} 
            className="grid grid-cols-[minmax(0,1fr)_45px_90px_100px] gap-0 border-b border-[#C99532]/10 items-start"
            style={{ minHeight: '38px', padding: '8px 0' }}
          >
            <div className="flex flex-col pr-4">
              <div className="text-white font-medium text-[11px] leading-tight mb-[2px]">
                {item.name || item.title || 'Product'}
              </div>
              {(item.color || item.size) && (
                <div className="text-[#D6D6D6] text-[9px]">
                  ({item.color}{item.color && item.size ? ' / ' : ''}{item.size})
                </div>
              )}
              {item.sku && (
                <div className="text-gray-500 text-[8px] mt-1 tracking-wide">
                  {item.sku}
                </div>
              )}
            </div>
            
            <div className="text-white text-right text-sm">
              {item.qty || item.quantity || 1}
            </div>
            
            <div className="text-white text-right text-sm">
              ₹{(item.rate || item.price || 0).toLocaleString()}
            </div>
            
            <div className="text-white text-right text-sm">
              ₹{(item.amount || item.total || 0).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
