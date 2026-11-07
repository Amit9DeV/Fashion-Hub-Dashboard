"use client";

import React from "react";
import { Clock, ShoppingCart, Trash2, ArrowRight, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

export function HeldCartsModal({
  isOpen,
  onClose,
  heldCarts = [],
  onResume,
  onDelete,
  onClearAll,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl bg-white shadow-2xl overflow-hidden border border-[#e8e3da] flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-[#faf9f6] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-[#fdf8f0] border border-[#e8d5b5] flex items-center justify-center text-[#8a5a10]">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[#0b0b0b]">Parked Sales ({heldCarts.length})</h3>
              <p className="text-xs text-[#706a61]">Resume a customer's bill or clear parked carts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#8a847a] hover:text-[#0b0b0b] hover:bg-[#eee9df] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {heldCarts.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingCart className="mx-auto size-12 text-[#dcd6ca] mb-3" />
              <p className="text-sm font-semibold text-[#0b0b0b]">No parked carts</p>
              <p className="text-xs text-[#8a847a] mt-1 max-w-xs mx-auto">
                When a customer needs to pick more items, click &quot;Park Bill&quot; to save their cart while you serve other shoppers.
              </p>
            </div>
          ) : (
            heldCarts.map((held) => {
              const customerName = held.customer?.name || held.customerDraft?.name || "Walk-in Customer";
              const customerPhone = held.customer?.mobile || held.customerDraft?.mobile || "";
              const itemsCount = (held.cart || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
              const formattedTime = new Date(held.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={held.id}
                  className="rounded-lg border border-[#e8e3da] bg-[#fffcf8] p-4 hover:border-[#c9963e]/60 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#0b0b0b]">{customerName}</span>
                      {customerPhone && (
                        <span className="text-xs text-[#706a61]">({customerPhone})</span>
                      )}
                      <span className="text-[10px] bg-[#f0ede7] text-[#5f584e] px-2 py-0.5 rounded-full font-medium ml-auto sm:ml-2">
                        {formattedTime}
                      </span>
                    </div>

                    <p className="text-xs text-[#706a61] line-clamp-1">
                      {held.cart?.map((i) => `${i.productName} (x${i.quantity})`).join(", ")}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-xs">
                      <span className="text-[#8a847a]">{itemsCount} item{itemsCount !== 1 ? 's' : ''}</span>
                      <span className="text-[#dfd8cc]">•</span>
                      <span className="font-financial font-bold text-[#1a6b3a] text-sm">
                        {formatMoney(held.totalPaisa)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#f0ede7]">
                    <Button
                      variant="gold"
                      size="sm"
                      className="h-8 px-3 text-xs font-semibold gap-1.5 flex-1 sm:flex-initial"
                      onClick={() => onResume(held)}
                    >
                      Resume Bill <ArrowRight size={13} />
                    </Button>
                    <button
                      type="button"
                      onClick={() => onDelete(held.id)}
                      className="p-1.5 rounded text-[#8a3a30] hover:bg-[#fff0ec] transition-colors"
                      title="Discard parked cart"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {heldCarts.length > 0 && (
          <div className="border-t bg-[#faf9f6] px-6 py-3 flex items-center justify-between">
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-[#8a3a30] hover:underline font-medium"
            >
              Clear All Parked Bills
            </button>
            <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

