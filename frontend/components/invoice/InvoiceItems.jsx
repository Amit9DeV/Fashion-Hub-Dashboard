import React from 'react';

export default function InvoiceItems({ items = [] }) {
  const displayItems = Array.isArray(items) ? items : [];

  function getQty(item) {
    return item.quantity || item.qty || 1;
  }

  function getRate(item) {
    if (item.unitPricePaisa !== undefined && item.unitPricePaisa !== null) {
      return item.unitPricePaisa / 100;
    }
    if (item.sellingPricePaisa !== undefined && item.sellingPricePaisa !== null) {
      return item.sellingPricePaisa / 100;
    }
    if (item.rate !== undefined && item.rate !== null) {
      return item.rate;
    }
    if (item.price !== undefined && item.price !== null) {
      return item.price;
    }
    return 0;
  }

  function getAmount(item, qty, rate) {
    if (item.totalPaisa !== undefined && item.totalPaisa !== null) {
      return item.totalPaisa / 100;
    }
    if (item.amount !== undefined && item.amount !== null) {
      return item.amount;
    }
    return rate * qty;
  }

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
        {displayItems.length === 0 ? (
          <div className="py-4 text-center text-xs text-[#a09a8f]">No items listed</div>
        ) : (
          displayItems.map((item, index) => {
            const qty = getQty(item);
            const rate = getRate(item);
            const amount = getAmount(item, qty, rate);
            const itemName = item.productName || item.name || item.title || 'Product';
            const color = item.color || '';
            const size = item.size || '';
            const sku = item.sku || '';

            return (
              <div 
                key={index} 
                className="grid grid-cols-[minmax(0,1fr)_45px_90px_100px] gap-0 border-b border-[#C99532]/10 items-start"
                style={{ minHeight: '38px', padding: '8px 0' }}
              >
                <div className="flex flex-col pr-4">
                  <div className="text-white font-medium text-xs leading-tight mb-[2px]">
                    {itemName}
                  </div>
                  {(color || size) && (
                    <div className="text-[#D6D6D6] text-[10px]">
                      {[color, size].filter(Boolean).join(" / ")}
                    </div>
                  )}
                  {sku && (
                    <div className="text-gray-400 font-mono text-[9px] mt-0.5 tracking-wide">
                      {sku}
                    </div>
                  )}
                </div>
                
                <div className="text-white text-right text-xs sm:text-sm font-mono">
                  {qty}
                </div>
                
                <div className="text-white text-right text-xs sm:text-sm font-mono">
                  ₹{rate.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </div>
                
                <div className="text-white text-right text-xs sm:text-sm font-mono font-medium">
                  ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
