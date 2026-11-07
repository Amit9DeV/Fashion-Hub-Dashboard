"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Boxes, Plus, Minus, ArrowUpDown, Check, X, SlidersHorizontal, PackagePlus, AlertCircle, Printer, Download, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";
import { api } from "@/src/services/api";
import { toast } from "sonner";
import BarcodePrintModal from "@/components/products/BarcodePrintModal";

export default function InventoryTable({ initialVariants, searchComponent }) {
  const [variants, setVariants] = useState(initialVariants || []);
  const [activeFilter, setActiveFilter] = useState("ALL"); // ALL, LOW, OUT, IN
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [adjustingVariant, setAdjustingVariant] = useState(null);
  const [adjustType, setAdjustType] = useState("ADD"); // ADD, DEDUCT, SET
  const [adjustQty, setAdjustQty] = useState("");
  const [saving, setSaving] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [barcodeVariants, setBarcodeVariants] = useState([]);

  // Compute live KPIs from current state
  const totalVariants = variants.length;
  const outOfStock = variants.filter((v) => v.stock === 0).length;
  const lowStock = variants.filter((v) => v.stock > 0 && v.stock <= (v.reorderLevel || 5)).length;
  const inStock = variants.filter((v) => v.stock > (v.reorderLevel || 5)).length;
  const totalUnits = variants.reduce((s, v) => s + (v.stock || 0), 0);
  const totalValuationSellingPaisa = variants.reduce(
    (sum, v) => sum + (v.stock || 0) * (v.sellingPricePaisa || 0),
    0
  );

  const { availableBrands, availableCategories } = useMemo(() => {
    const bSet = new Set();
    const cSet = new Set();
    variants.forEach((v) => {
      if (v.brand) bSet.add(v.brand);
      if (v.category) cSet.add(v.category);
    });
    return {
      availableBrands: Array.from(bSet).sort(),
      availableCategories: Array.from(cSet).sort(),
    };
  }, [variants]);

  const filteredVariants = useMemo(() => {
    return variants.filter((v) => {
      if (selectedBrand && v.brand !== selectedBrand) return false;
      if (selectedCategory && v.category !== selectedCategory) return false;

      const isOut = v.stock === 0;
      const isLow = v.stock > 0 && v.stock <= (v.reorderLevel || 5);
      if (activeFilter === "LOW") return isLow;
      if (activeFilter === "OUT") return isOut;
      if (activeFilter === "IN") return !isOut && !isLow;
      return true;
    });
  }, [variants, activeFilter, selectedBrand, selectedCategory]);

  const handleExportCsv = () => {
    if (!filteredVariants.length) return;
    const headers = ["Product Name", "SKU", "Barcode", "Brand", "Category", "Color", "Size", "Stock Qty", "Cost (Rs)", "Selling Price (Rs)", "Total Stock Value (Rs)"];
    const rows = filteredVariants.map((v) => [
      `"${(v.productName || "").replace(/"/g, '""')}"`,
      `"${v.sku || ""}"`,
      `"${v.barcode || ""}"`,
      `"${(v.brand || "").replace(/"/g, '""')}"`,
      `"${(v.category || "").replace(/"/g, '""')}"`,
      `"${v.color || ""}"`,
      `"${v.size || ""}"`,
      v.stock || 0,
      ((v.costPricePaisa || 0) / 100).toFixed(2),
      ((v.sellingPricePaisa || 0) / 100).toFixed(2),
      (((v.stock || 0) * (v.sellingPricePaisa || 0)) / 100).toFixed(2),
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory_stock_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Inventory stock exported to CSV");
  };

  const handleOpenAdjust = (variant, defaultType = "ADD") => {
    setAdjustingVariant(variant);
    setAdjustType(defaultType);
    setAdjustQty("");
  };

  const handleSaveStock = async (e) => {
    e.preventDefault();
    if (!adjustingVariant) return;

    const qty = parseInt(adjustQty, 10);
    if (isNaN(qty) || qty < 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    let newStock = adjustingVariant.stock;
    if (adjustType === "ADD") {
      newStock += qty;
    } else if (adjustType === "DEDUCT") {
      newStock = Math.max(0, newStock - qty);
    } else if (adjustType === "SET") {
      newStock = qty;
    }

    setSaving(true);
    try {
      await api.products.updateVariant(adjustingVariant.productId, adjustingVariant._id, {
        stock: newStock,
      });

      setVariants((prev) =>
        prev.map((v) =>
          v._id === adjustingVariant._id ? { ...v, stock: newStock } : v
        )
      );

      toast.success(
        `Stock for ${adjustingVariant.productName} updated to ${newStock} units`
      );
      setAdjustingVariant(null);
    } catch (err) {
      toast.error(err.message || "Failed to update stock");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── KPI Row ── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <button
          type="button"
          onClick={() => setActiveFilter("ALL")}
          className={`rounded-md border p-4 text-left transition-all ${activeFilter === "ALL" ? "ring-2 ring-[#1a3a7a] bg-[#f8faff]" : "bg-white hover:bg-gray-50"}`}
          style={{ borderLeft: "3px solid #1a3a7a" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1a3a7a]">Total Variants</p>
          <p className="mt-2 text-2xl font-bold font-financial text-[#1a3a7a]">{totalVariants}</p>
          <p className="text-[11px] text-[#706a61] mt-1">{totalUnits.toLocaleString()} units total</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("LOW")}
          className={`rounded-md border p-4 text-left transition-all ${activeFilter === "LOW" ? "ring-2 ring-[#8a5a10] bg-[#fffcf5]" : "bg-white hover:bg-gray-50"}`}
          style={{ borderLeft: "3px solid #8a5a10" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8a5a10]">Low Stock (≤5)</p>
          <p className="mt-2 text-2xl font-bold font-financial text-[#8a5a10]">{lowStock}</p>
          <p className="text-[11px] text-[#706a61] mt-1">Requires reorder</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("OUT")}
          className={`rounded-md border p-4 text-left transition-all ${activeFilter === "OUT" ? "ring-2 ring-[#8a1a1a] bg-[#fff5f5]" : "bg-white hover:bg-gray-50"}`}
          style={{ borderLeft: "3px solid #8a1a1a" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8a1a1a]">Out of Stock</p>
          <p className="mt-2 text-2xl font-bold font-financial text-[#8a1a1a]">{outOfStock}</p>
          <p className="text-[11px] text-[#706a61] mt-1">0 units remaining</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter("IN")}
          className={`rounded-md border p-4 text-left transition-all ${activeFilter === "IN" ? "ring-2 ring-[#1a6b3a] bg-[#f0f9f4]" : "bg-white hover:bg-gray-50"}`}
          style={{ borderLeft: "3px solid #1a6b3a" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1a6b3a]">In Stock (&gt;5)</p>
          <p className="mt-2 text-2xl font-bold font-financial text-[#1a6b3a]">{inStock}</p>
          <p className="text-[11px] text-[#706a61] mt-1">Sufficient level</p>
        </button>

        <div
          className="rounded-md border p-4 text-left bg-white col-span-2 sm:col-span-1"
          style={{ borderLeft: "3px solid #5a2a7a" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5a2a7a]">Retail Valuation</p>
          <p className="mt-2 text-2xl font-bold font-financial text-[#5a2a7a] truncate">{formatMoney(totalValuationSellingPaisa)}</p>
          <p className="text-[11px] text-[#706a61] mt-1">Live merchandise value</p>
        </div>
      </section>

      {/* ── Toolbar: Search & Filter Tabs ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="flex-1 min-w-[220px]">
              {searchComponent}
            </div>

            {availableBrands.length > 0 && (
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="h-10 border border-[#dfd8cc] rounded-md px-3 text-xs text-[#5f584e] bg-white focus:outline-none focus:ring-1 focus:ring-[#9b7740]"
              >
                <option value="">All Brands</option>
                {availableBrands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            )}

            {availableCategories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-10 border border-[#dfd8cc] rounded-md px-3 text-xs text-[#5f584e] bg-white focus:outline-none focus:ring-1 focus:ring-[#9b7740]"
              >
                <option value="">All Categories</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-10 text-xs border-[#dfd8cc] text-[#5f584e] hover:text-[#0b0b0b] flex items-center gap-1.5 shrink-0"
              title="Export inventory to CSV"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setBarcodeVariants(filteredVariants.slice(0, 50));
                setIsBarcodeModalOpen(true);
              }}
              className="h-10 text-xs border-[#d8c3a5] text-[#2c2724] hover:bg-[#faf7f2] flex items-center gap-1.5 shrink-0"
              title="Print barcode labels for filtered items"
            >
              <Printer size={14} className="text-[#c9963e]" />
              <span className="hidden sm:inline">Print Barcodes</span>
            </Button>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs text-[#8a847a] font-medium mr-1 hidden sm:inline">Status:</span>
          {[
            { id: "ALL", label: `All (${variants.length})` },
            { id: "LOW", label: `Low Stock (${lowStock})` },
            { id: "OUT", label: `Out of Stock (${outOfStock})` },
            { id: "IN", label: `In Stock (${inStock})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                activeFilter === tab.id
                  ? "bg-[#0b0b0b] text-[#d8b46a] shadow-sm"
                  : "bg-white border border-[#dfd8cc] text-[#5f584e] hover:bg-[#faf9f6]"
              }`}
            >
              {tab.label}
            </button>
          ))}
          {(selectedBrand || selectedCategory || activeFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSelectedBrand("");
                setSelectedCategory("");
                setActiveFilter("ALL");
              }}
              className="text-xs text-[#9b7740] hover:underline font-semibold ml-2 whitespace-nowrap"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <section className="overflow-hidden rounded-md border bg-white shadow-sm">
        {filteredVariants.length === 0 ? (
          <div className="grid min-h-[260px] place-items-center p-6 text-center">
            <div>
              <Boxes className="mx-auto text-[#c9963e]" size={28} />
              <p className="mt-3 text-sm font-medium text-[#5f584e]">
                {activeFilter !== "ALL"
                  ? `No variants in "${activeFilter}" category.`
                  : "No variants found."}
              </p>
              {activeFilter !== "ALL" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveFilter("ALL")}
                  className="mt-3 text-xs"
                >
                  Show All Variants
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-[#81796d]">
                <tr>
                  <th className="px-5 py-3 font-semibold">SKU / Code</th>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Variant Attributes</th>
                  <th className="px-5 py-3 font-semibold text-right">Cost</th>
                  <th className="px-5 py-3 font-semibold text-right">Selling</th>
                  <th className="px-5 py-3 text-right font-semibold">Stock</th>
                  <th className="px-5 py-3 text-center font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Quick Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ede7]">
                {filteredVariants.map((v) => {
                  const isOut = v.stock === 0;
                  const isLow = v.stock > 0 && v.stock <= (v.reorderLevel || 5);
                  const stockColor = isOut
                    ? "text-[#8a1a1a]"
                    : isLow
                    ? "text-[#8a5a10]"
                    : "text-[#1a6b3a]";
                  const badge = isOut
                    ? { label: "Out of stock", cls: "bg-[#fef0f0] text-[#8a1a1a]" }
                    : isLow
                    ? { label: "Low stock", cls: "bg-[#fdf8f0] text-[#8a5a10]" }
                    : { label: "In stock", cls: "bg-[#f0f9f4] text-[#1a6b3a]" };

                  return (
                    <tr
                      key={v._id?.toString() || v.sku}
                      className="hover:bg-[#faf9f6] transition-colors"
                    >
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-[#5f584e]">
                        {v.sku || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/products/${v.productId}`}
                          className="font-semibold text-[#0b0b0b] hover:text-[#c9963e] transition-colors"
                        >
                          {v.productName}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#625d54]">
                        {[v.color, v.size].filter(Boolean).join(" · ") || "Default"}
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs text-[#8a847a] font-financial">
                        {v.costPricePaisa ? formatMoney(v.costPricePaisa) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs font-semibold font-financial text-[#0b0b0b]">
                        {v.sellingPricePaisa ? formatMoney(v.sellingPricePaisa) : "—"}
                      </td>
                      <td className={`px-5 py-3.5 text-right font-bold ${stockColor}`}>
                        <span className="text-base font-financial">{v.stock}</span>
                        {isLow && (
                          <span className="block text-[9px] font-normal text-[#8a5a10] opacity-80">
                            alert threshold ≤ {v.reorderLevel || 5}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex rounded-sm px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setBarcodeVariants([v]);
                              setIsBarcodeModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded border border-[#dfd8cc] bg-white hover:bg-gray-100 px-2 py-1 text-[11px] font-semibold text-[#5f584e] transition-colors"
                            title="Print Barcode Tag"
                          >
                            <Printer size={12} className="text-[#c9963e]" /> Tag
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenAdjust(v, "ADD")}
                            className="inline-flex items-center gap-1 rounded bg-[#f0f9f4] hover:bg-[#dff2e6] border border-[#a3d9b8] px-2 py-1 text-[11px] font-semibold text-[#1a6b3a] transition-colors"
                            title="Add Received Stock"
                          >
                            <Plus size={12} /> Add
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenAdjust(v, "SET")}
                            className="inline-flex items-center gap-1 rounded border border-[#dfd8cc] bg-white hover:bg-gray-100 px-2 py-1 text-[11px] font-semibold text-[#5f584e] transition-colors"
                            title="Set Stock / Adjust"
                          >
                            <SlidersHorizontal size={12} /> Set
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Quick Stock Adjust Modal ── */}
      {adjustingVariant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150"
          onClick={() => setAdjustingVariant(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white shadow-2xl overflow-hidden border border-[#e8e3da]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b bg-[#faf9f6] px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9b7740]">
                  Stock Adjustment
                </p>
                <h3 className="font-semibold text-sm text-[#0b0b0b]">
                  {adjustingVariant.productName}
                </h3>
                <p className="text-xs text-[#706a61] mt-0.5">
                  SKU: <span className="font-mono">{adjustingVariant.sku}</span> · Current:{" "}
                  <strong>{adjustingVariant.stock} units</strong>
                </p>
              </div>
              <button
                onClick={() => setAdjustingVariant(null)}
                className="text-[#8a847a] hover:text-[#0b0b0b] p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                  Action Type
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "ADD", label: "+ Add Stock" },
                    { id: "DEDUCT", label: "− Deduct" },
                    { id: "SET", label: "= Set Exact" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setAdjustType(mode.id)}
                      className={`py-1.5 text-xs font-semibold rounded border transition-colors ${
                        adjustType === mode.id
                          ? "bg-[#0b0b0b] text-[#d8b46a] border-[#0b0b0b]"
                          : "bg-white text-[#5f584e] border-[#dfd8cc] hover:bg-gray-50"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                  {adjustType === "ADD"
                    ? "Units to Add (Receive Stock)"
                    : adjustType === "DEDUCT"
                    ? "Units to Deduct (Damaged / Waste)"
                    : "New Exact Stock Count"}
                </label>
                <Input
                  type="number"
                  min="0"
                  required
                  autoFocus
                  placeholder="e.g. 10"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="h-10 text-base font-semibold"
                />
              </div>

              {adjustQty && !isNaN(parseInt(adjustQty, 10)) && (
                <div className="rounded bg-[#faf9f6] border border-[#e6e0d5] p-2.5 text-xs text-[#5f584e] flex justify-between">
                  <span>Resulting Stock:</span>
                  <strong className="text-[#0b0b0b] font-financial">
                    {adjustType === "ADD"
                      ? adjustingVariant.stock + parseInt(adjustQty, 10)
                      : adjustType === "DEDUCT"
                      ? Math.max(0, adjustingVariant.stock - parseInt(adjustQty, 10))
                      : parseInt(adjustQty, 10)}{" "}
                    units
                  </strong>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#f0ede7]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAdjustingVariant(null)}
                  disabled={saving}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  size="sm"
                  disabled={saving || !adjustQty}
                  className="h-9 text-xs px-4"
                >
                  {saving ? "Saving..." : "Update Stock"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BarcodePrintModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        variants={barcodeVariants}
      />
    </div>
  );
}
