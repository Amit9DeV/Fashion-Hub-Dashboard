"use client";

import React from "react";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: "F2 / Ctrl+K", desc: "Focus Barcode Scanner / Product Search box" },
    { key: "F4", desc: "Complete sale and record payment" },
    { key: "F8", desc: "Open / Close Cash Drawer shift modal" },
    { key: "F9", desc: "Show Dynamic UPI QR Code for instant payment" },
    { key: "Enter (in Search)", desc: "Quick-add product or exact barcode match to bill" },
    { key: "Esc", desc: "Close any active modal or search dropdown" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#e8e3da]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#eee9df]">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-[#fdf8f0] text-[#8a5a10] border border-[#e6c97a] flex items-center justify-center">
              <Keyboard size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[#0b0b0b]">
                POS Keyboard Shortcuts
              </h3>
              <p className="text-[11px] text-[#706a61]">
                High-speed cashier keyboard controls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8a847a] hover:text-[#0b0b0b] p-1 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="divide-y divide-[#f5f2ee] my-3">
          {shortcuts.map((sc, i) => (
            <div key={i} className="py-2.5 flex items-center justify-between gap-4">
              <span className="text-xs text-[#5f584e]">{sc.desc}</span>
              <kbd className="px-2.5 py-1 text-xs font-mono font-semibold rounded bg-[#f5f2ee] border border-[#dfd8cc] text-[#0b0b0b] shadow-xs shrink-0">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-[#eee9df] flex justify-end">
          <Button variant="gold" size="sm" onClick={onClose} className="h-8 text-xs font-semibold px-4">
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}

