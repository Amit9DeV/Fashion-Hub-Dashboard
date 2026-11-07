"use client";

import { useState, useEffect } from "react";
import { Printer, X, Check, BarChart2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/src/services/api";
import { toast } from "sonner";
import { formatMoney } from "@/lib/utils";

export default function BarcodePrintModal({
  isOpen,
  onClose,
  variants = [],
  productName = "",
}) {
  const [selectedVariants, setSelectedVariants] = useState({}); // { variantId: quantity }
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && variants.length > 0) {
      // Default: select all variants with quantity 1
      const initial = {};
      variants.forEach((v) => {
        const id = v._id?.toString() || v.variantId?.toString();
        if (id) {
          initial[id] = 1;
        }
      });
      setSelectedVariants(initial);
    }
  }, [isOpen, variants]);

  if (!isOpen) return null;

  const totalLabels = Object.values(selectedVariants).reduce(
    (sum, qty) => sum + (parseInt(qty, 10) || 0),
    0
  );

  const toggleSelect = (variantId) => {
    setSelectedVariants((prev) => {
      const copy = { ...prev };
      if (copy[variantId] !== undefined) {
        delete copy[variantId];
      } else {
        copy[variantId] = 1;
      }
      return copy;
    });
  };

  const setQty = (variantId, val) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setSelectedVariants((prev) => ({
      ...prev,
      [variantId]: num,
    }));
  };

  const handleSelectAll = (select) => {
    if (!select) {
      setSelectedVariants({});
    } else {
      const all = {};
      variants.forEach((v) => {
        const id = v._id?.toString() || v.variantId?.toString();
        if (id) all[id] = 1;
      });
      setSelectedVariants(all);
    }
  };

  const handleMatchStock = () => {
    const stockMap = {};
    variants.forEach((v) => {
      const id = v._id?.toString() || v.variantId?.toString();
      if (id) {
        stockMap[id] = Math.max(1, v.stock || 1);
      }
    });
    setSelectedVariants(stockMap);
    toast.success("Quantities matched to in-stock units!");
  };

  const handleGenerate = async () => {
    const items = Object.entries(selectedVariants)
      .filter(([_, qty]) => (parseInt(qty, 10) || 0) > 0)
      .map(([variantId, quantity]) => ({
        variantId,
        quantity: parseInt(quantity, 10),
      }));

    if (items.length === 0) {
      toast.warning("Please choose at least 1 label copy to print.");
      return;
    }

    setLoading(true);
    try {
      const blob = await api.products.downloadBarcodesPdf(items);
      const fileUrl = URL.createObjectURL(blob);
      const printWindow = window.open(fileUrl, "_blank");
      if (!printWindow) {
        // Fallback: download if pop-up blocked
        const a = document.createElement("a");
        a.href = fileUrl;
        a.download = `barcodes_${Date.now()}.pdf`;
        a.click();
      }
      toast.success(`Generated ${totalLabels} barcode label(s)!`);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to generate barcode labels");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl bg-white shadow-2xl overflow-hidden border border-[#e8e3da] flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-[#faf9f6] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-[#fdf8f0] text-[#8a5a10] border border-[#e6c97a] flex items-center justify-center">
              <Printer size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[#0b0b0b]">
                Print Barcode Labels
              </h3>
              <p className="text-xs text-[#706a61]">
                {productName ? `${productName} · ` : ""}Standard 4×11 A4 / Tag
                Sheet
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

        {/* Subhead / Controls */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#fcfbfa] border-b text-xs text-[#706a61]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                handleSelectAll(
                  Object.keys(selectedVariants).length < variants.length
                )
              }
              className="font-medium text-[#9b7740] hover:underline"
            >
              {Object.keys(selectedVariants).length === variants.length
                ? "Deselect All"
                : "Select All (1 each)"}
            </button>
            <span className="text-[#ccc]">·</span>
            <button
              type="button"
              onClick={handleMatchStock}
              className="font-medium text-[#1a6b3a] hover:underline"
              title="Set print copies matching live inventory stock count"
            >
              Match In-Stock Qty
            </button>
          </div>
          <span className="font-semibold text-[#0b0b0b]">
            Total Labels:{" "}
            <span className="font-financial text-sm text-[#1a6b3a]">
              {totalLabels}
            </span>
          </span>
        </div>

        {/* Variant List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {variants.length === 0 ? (
            <p className="text-center py-8 text-sm text-[#706a61]">
              No variants available to print.
            </p>
          ) : (
            variants.map((v) => {
              const id = v._id?.toString() || v.variantId?.toString();
              const isSelected = selectedVariants[id] !== undefined;
              const qty = selectedVariants[id] ?? 0;

              return (
                <div
                  key={id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    isSelected
                      ? "border-[#c9963e] bg-[#fffcf5]"
                      : "border-[#e6e0d5] bg-white opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(id)}
                      className="size-4 rounded accent-[#c9963e] cursor-pointer"
                    />
                    <div>
                      <p className="font-semibold text-sm text-[#0b0b0b]">
                        {v.productName || productName || "Variant"}
                      </p>
                      <p className="text-xs text-[#706a61] font-mono mt-0.5">
                        {[v.sku, v.color, v.size].filter(Boolean).join(" · ")}
                      </p>
                      <p className="text-[11px] text-[#8a847a] mt-0.5">
                        Barcode: {v.barcode || v.sku || "None"} · MRP:{" "}
                        {formatMoney(v.mrpPaisa || v.sellingPricePaisa || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#706a61]">Copies:</span>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      disabled={!isSelected}
                      value={qty}
                      onChange={(e) => setQty(id, e.target.value)}
                      className="w-16 h-8 text-center text-xs font-semibold"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t bg-[#faf9f6] px-6 py-4">
          <p className="text-xs text-[#706a61]">
            Prints labels formatted with store product name, MRP, and Barcode.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="gold"
              size="sm"
              disabled={loading || totalLabels === 0}
              onClick={handleGenerate}
              className="flex items-center gap-1.5"
            >
              <Printer size={14} />
              {loading ? "Generating PDF..." : `Print ${totalLabels} Label(s)`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

