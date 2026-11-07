"use client";

import { useState, useMemo, useEffect } from "react";
import { Check, Edit2, Loader2, Save, X, Search, Download, Percent, Tag, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/src/services/api";
import { toast } from "sonner";
import { cn, formatMoney } from "@/lib/utils";

export function PricingEditor({ initialVariants }) {
  const [variants, setVariants] = useState(initialVariants || []);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ costPrice: "", mrp: "", sellingPrice: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Bulk operation state
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState("DISCOUNT_PERCENT"); // DISCOUNT_PERCENT, MARKUP_COST, FLAT_DISCOUNT, CHARM_PRICING
  const [bulkValue, setBulkValue] = useState("");
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // Extract unique brands & categories
  const { availableBrands, availableCategories } = useMemo(() => {
    const brandsSet = new Set();
    const categoriesSet = new Set();
    variants.forEach((v) => {
      if (v.productBrand) brandsSet.add(v.productBrand);
      if (v.productCategory) categoriesSet.add(v.productCategory);
    });
    return {
      availableBrands: Array.from(brandsSet).sort(),
      availableCategories: Array.from(categoriesSet).sort(),
    };
  }, [variants]);

  const filteredVariants = useMemo(() => {
    return variants.filter((v) => {
      if (selectedBrand && v.productBrand !== selectedBrand) return false;
      if (selectedCategory && v.productCategory !== selectedCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const searchString = `${v.productName} ${v.sku} ${v.color} ${v.size} ${v.productBrand} ${v.productCategory}`.toLowerCase();
      return searchString.includes(q);
    });
  }, [variants, searchQuery, selectedBrand, selectedCategory]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredVariants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVariants.map((v) => v._id)));
    }
  };

  function startEdit(variant) {
    setEditingId(variant._id);
    setDraft({
      costPrice: variant.costPricePaisa != null ? (variant.costPricePaisa / 100).toString() : "",
      mrp: variant.mrpPaisa != null ? (variant.mrpPaisa / 100).toString() : "",
      sellingPrice: variant.sellingPricePaisa != null ? (variant.sellingPricePaisa / 100).toString() : "",
    });
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setError("");
  }

  async function saveEdit(variant) {
    setIsSaving(true);
    setError("");
    try {
      const payload = {
        costPrice: draft.costPrice || undefined,
        mrp: draft.mrp || undefined,
        sellingPrice: draft.sellingPrice || undefined,
      };

      await api.products.updateVariant(variant.productId, variant._id, payload);

      setVariants((current) =>
        current.map((v) => {
          if (v._id === variant._id) {
            return {
              ...v,
              costPricePaisa: payload.costPrice ? Math.round(parseFloat(payload.costPrice) * 100) : v.costPricePaisa,
              mrpPaisa: payload.mrp ? Math.round(parseFloat(payload.mrp) * 100) : v.mrpPaisa,
              sellingPricePaisa: payload.sellingPrice ? Math.round(parseFloat(payload.sellingPrice) * 100) : v.sellingPricePaisa,
            };
          }
          return v;
        })
      );

      toast.success("Pricing updated successfully");
      setEditingId(null);
    } catch (err) {
      setError(err.message || "Failed to save pricing.");
    } finally {
      setIsSaving(false);
    }
  }

  // Handle Bulk Pricing Update
  const handleApplyBulkPricing = async () => {
    if (selectedIds.size === 0) {
      toast.warning("Please select at least one variant to update.");
      return;
    }

    const val = parseFloat(bulkValue);
    if (bulkMode !== "CHARM_PRICING" && (isNaN(val) || val <= 0)) {
      toast.warning("Please enter a valid positive number.");
      return;
    }

    setIsBulkSaving(true);
    const updates = [];
    const updatedVariantsMap = new Map();

    variants.forEach((v) => {
      if (!selectedIds.has(v._id)) return;

      const mrp = v.mrpPaisa != null ? v.mrpPaisa / 100 : v.sellingPricePaisa / 100;
      const cost = v.costPricePaisa != null ? v.costPricePaisa / 100 : 0;
      let newSelling = v.sellingPricePaisa / 100;

      if (bulkMode === "DISCOUNT_PERCENT") {
        // e.g. 20% discount on MRP
        newSelling = Math.max(0, mrp * (1 - val / 100));
      } else if (bulkMode === "FLAT_DISCOUNT") {
        // e.g. ₹200 off MRP
        newSelling = Math.max(0, mrp - val);
      } else if (bulkMode === "MARKUP_COST") {
        // e.g. Cost + 50%
        newSelling = Math.max(0, cost * (1 + val / 100));
      } else if (bulkMode === "CHARM_PRICING") {
        // Round current selling price to end with 99 or 49
        const base = Math.floor(newSelling / 100) * 100;
        newSelling = base + 99;
      }

      const newSellingPaisa = Math.round(newSelling * 100);
      updates.push({
        variantId: v._id,
        sellingPricePaisa: newSellingPaisa,
        mrpPaisa: v.mrpPaisa,
        costPricePaisa: v.costPricePaisa,
      });

      updatedVariantsMap.set(v._id, {
        ...v,
        sellingPricePaisa: newSellingPaisa,
      });
    });

    try {
      await api.products.bulkUpdateVariants(updates);
      setVariants((current) =>
        current.map((v) => (updatedVariantsMap.has(v._id) ? updatedVariantsMap.get(v._id) : v))
      );
      toast.success(`Successfully updated pricing for ${updates.length} item(s)!`);
      setIsBulkOpen(false);
      setSelectedIds(new Set());
      setBulkValue("");
    } catch (err) {
      toast.error(err.message || "Bulk update failed");
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleExportCsv = () => {
    if (!filteredVariants.length) return;
    const headers = [
      "Product Name",
      "Brand",
      "Category",
      "SKU",
      "Color",
      "Size",
      "Cost Price (Rs)",
      "MRP (Rs)",
      "Selling Price (Rs)",
      "Gross Margin %",
      "Stock Units",
    ];

    const rows = filteredVariants.map((v) => {
      const cp = v.costPricePaisa ? (v.costPricePaisa / 100).toFixed(2) : "0.00";
      const mrp = v.mrpPaisa ? (v.mrpPaisa / 100).toFixed(2) : "0.00";
      const sp = v.sellingPricePaisa ? (v.sellingPricePaisa / 100).toFixed(2) : "0.00";
      const margin =
        v.sellingPricePaisa && v.costPricePaisa
          ? (((v.sellingPricePaisa - v.costPricePaisa) / v.sellingPricePaisa) * 100).toFixed(1)
          : "0.0";

      return [
        `"${(v.productName || "").replace(/"/g, '""')}"`,
        `"${(v.productBrand || "").replace(/"/g, '""')}"`,
        `"${(v.productCategory || "").replace(/"/g, '""')}"`,
        `"${(v.sku || "").replace(/"/g, '""')}"`,
        `"${(v.color || "").replace(/"/g, '""')}"`,
        `"${(v.size || "").replace(/"/g, '""')}"`,
        cp,
        mrp,
        sp,
        margin,
        v.stock ?? 0,
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pricing_catalog_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-md border bg-white shadow-sm overflow-hidden space-y-0">
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-5 py-3 text-sm text-red-700 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Toolbar: Search, Filters & Export ── */}
      <div className="p-4 border-b border-[#f0ede7] bg-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8a847a]" />
            <Input
              placeholder="Search product, SKU, color..."
              className="pl-9 h-9 text-xs focus-visible:ring-[#c9963e]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="h-9 rounded-md border border-[#dfd8cc] bg-white px-3 text-xs text-[#5f584e] outline-none focus:border-[#c9963e]"
          >
            <option value="">All Brands</option>
            {availableBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 rounded-md border border-[#dfd8cc] bg-white px-3 text-xs text-[#5f584e] outline-none focus:border-[#c9963e]"
          >
            <option value="">All Categories</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {(selectedBrand || selectedCategory || searchQuery) && (
            <button
              onClick={() => {
                setSelectedBrand("");
                setSelectedCategory("");
                setSearchQuery("");
              }}
              className="text-xs text-[#8a3a30] hover:underline px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 px-3 text-xs text-[#5f584e] hover:text-[#0b0b0b] flex items-center gap-1.5"
          >
            <Download size={13} /> Export CSV
          </Button>

          {selectedIds.size > 0 && (
            <Button
              variant="gold"
              size="sm"
              onClick={() => setIsBulkOpen(true)}
              className="h-9 px-3 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in"
            >
              <Percent size={13} /> Bulk Edit ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* ── Selection Summary Row ── */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-[#faf9f6] border-b border-[#dfd8cc] text-xs">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-[#5f584e]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-[#c9963e] focus:ring-[#c9963e]"
              checked={filteredVariants.length > 0 && selectedIds.size === filteredVariants.length}
              onChange={toggleSelectAll}
            />
            <span>Select All Visible ({filteredVariants.length})</span>
          </label>
          {selectedIds.size > 0 && (
            <span className="text-[#8a5a10] font-semibold">
              · {selectedIds.size} variant(s) selected
            </span>
          )}
        </div>
        <span className="text-[#81796d]">
          Showing {filteredVariants.length} of {variants.length} catalog items
        </span>
      </div>

      {/* ── Bulk Actions Drawer / Modal ── */}
      {isBulkOpen && (
        <div className="bg-[#fffcf5] border-b-2 border-[#c9963e] p-4 sm:p-5 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-3 border-b border-[#ebdcc4]">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-[#8a5a10] bg-[#fbf0d8] px-2 py-0.5 rounded">
                Bulk Pricing Engine
              </span>
              <span className="text-xs text-[#706a61]">
                Applying to {selectedIds.size} selected item(s)
              </span>
            </div>
            <button
              onClick={() => setIsBulkOpen(false)}
              className="text-[#8a847a] hover:text-[#0b0b0b] p-1"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 pt-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-[#5f584e] mb-1">
                Operation Type
              </label>
              <select
                value={bulkMode}
                onChange={(e) => setBulkMode(e.target.value)}
                className="w-full h-9 rounded-md border border-[#dfd8cc] bg-white px-3 text-xs outline-none focus:border-[#c9963e]"
              >
                <option value="DISCOUNT_PERCENT">Percent Discount on MRP (%)</option>
                <option value="FLAT_DISCOUNT">Flat Amount Discount on MRP (₹)</option>
                <option value="MARKUP_COST">Markup from Cost Price (%)</option>
                <option value="CHARM_PRICING">Charm Pricing (End with ₹99)</option>
              </select>
            </div>

            {bulkMode !== "CHARM_PRICING" ? (
              <div>
                <label className="block text-xs font-semibold text-[#5f584e] mb-1">
                  {bulkMode === "DISCOUNT_PERCENT" && "Discount Percentage (e.g. 15 for 15% off)"}
                  {bulkMode === "FLAT_DISCOUNT" && "Flat Reduction in Rupees (e.g. 200)"}
                  {bulkMode === "MARKUP_COST" && "Markup Percentage above Cost (e.g. 50%)"}
                </label>
                <Input
                  type="number"
                  placeholder="Enter value"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="h-9 text-xs bg-white"
                  autoFocus
                />
              </div>
            ) : (
              <div className="text-xs text-[#706a61] pb-2">
                Automatically adjusts prices to psychological retail endings (e.g. ₹999, ₹1499).
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="gold"
                size="sm"
                onClick={handleApplyBulkPricing}
                disabled={isBulkSaving}
                className="h-9 px-4 text-xs font-semibold flex-1"
              >
                {isBulkSaving ? <Loader2 size={13} className="animate-spin mr-1" /> : <Check size={13} className="mr-1" />}
                Save Changes to Catalog
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkOpen(false)}
                className="h-9 px-3 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-[#81796d]">
            <tr>
              <th className="px-5 py-3 font-semibold w-10 text-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-[#c9963e] focus:ring-[#c9963e]"
                  checked={filteredVariants.length > 0 && selectedIds.size === filteredVariants.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-5 py-3 font-semibold">Product & Variant</th>
              <th className="px-5 py-3 font-semibold">Brand / Category</th>
              <th className="px-5 py-3 font-semibold text-right">Cost Price (₹)</th>
              <th className="px-5 py-3 font-semibold text-right">MRP (₹)</th>
              <th className="px-5 py-3 font-semibold text-right">Selling Price (₹)</th>
              <th className="px-5 py-3 font-semibold text-right">Margin %</th>
              <th className="px-5 py-3 font-semibold text-right w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0ede7]">
            {filteredVariants.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-[#706a61]">
                  {searchQuery || selectedBrand || selectedCategory
                    ? "No products found matching the selected filters."
                    : "No products available in catalog."}
                </td>
              </tr>
            ) : (
              filteredVariants.map((variant) => {
                const isEditing = editingId === variant._id;
                const isSelected = selectedIds.has(variant._id);
                const variantSubName = [variant.color, variant.size, variant.sku].filter(Boolean).join(" · ");

                const cp = variant.costPricePaisa != null ? variant.costPricePaisa / 100 : 0;
                const sp = variant.sellingPricePaisa != null ? variant.sellingPricePaisa / 100 : 0;
                const marginPct = sp > 0 && cp > 0 ? (((sp - cp) / sp) * 100).toFixed(1) : null;

                return (
                  <tr
                    key={variant._id}
                    className={cn(
                      "transition-colors",
                      isEditing ? "bg-[#fffaf0]" : isSelected ? "bg-[#fffdf7]" : "hover:bg-[#faf9f6]"
                    )}
                  >
                    <td className="px-5 py-3.5 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-[#c9963e] focus:ring-[#c9963e]"
                        checked={isSelected}
                        onChange={() => toggleSelect(variant._id)}
                      />
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-[#0b0b0b]">{variant.productName}</p>
                      <p className="text-xs text-[#706a61] mt-0.5">{variantSubName || "Base Variant"}</p>
                    </td>

                    <td className="px-5 py-3.5 text-xs text-[#5f584e]">
                      <span>{variant.productBrand || "—"}</span>
                      {variant.productCategory && (
                        <p className="text-[11px] text-[#8a847a]">{variant.productCategory}</p>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          className="w-24 ml-auto h-8 text-right bg-white"
                          value={draft.costPrice}
                          onChange={(e) => setDraft({ ...draft, costPrice: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(variant);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          placeholder="0.00"
                        />
                      ) : (
                        <span className="font-financial text-[#706a61]">
                          {variant.costPricePaisa != null ? formatMoney(variant.costPricePaisa) : "—"}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          className="w-24 ml-auto h-8 text-right bg-white"
                          value={draft.mrp}
                          onChange={(e) => setDraft({ ...draft, mrp: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(variant);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          placeholder="0.00"
                        />
                      ) : (
                        <span className="font-financial text-[#706a61]">
                          {variant.mrpPaisa != null ? formatMoney(variant.mrpPaisa) : "—"}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          className="w-24 ml-auto h-8 text-right bg-white font-semibold focus-visible:ring-[#c9963e]"
                          value={draft.sellingPrice}
                          onChange={(e) => setDraft({ ...draft, sellingPrice: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(variant);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          placeholder="0.00"
                        />
                      ) : (
                        <span className="font-financial font-semibold text-[#1a6b3a]">
                          {variant.sellingPricePaisa != null ? formatMoney(variant.sellingPricePaisa) : "—"}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      {marginPct != null ? (
                        <span
                          className={`font-financial text-xs font-semibold px-2 py-0.5 rounded ${
                            parseFloat(marginPct) >= 40
                              ? "bg-[#f0f9f4] text-[#1a6b3a]"
                              : parseFloat(marginPct) > 0
                              ? "bg-[#fdf8f0] text-[#8a5a10]"
                              : "bg-[#fef0f0] text-[#8a1a1a]"
                          }`}
                        >
                          {marginPct}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={cancelEdit}
                            disabled={isSaving}
                            className="p-1.5 text-gray-400 hover:text-gray-700 bg-white border rounded shadow-xs disabled:opacity-50"
                          >
                            <X size={14} />
                          </button>
                          <button
                            onClick={() => saveEdit(variant)}
                            disabled={isSaving}
                            className="p-1.5 text-white bg-[#c9963e] hover:bg-[#b08030] rounded shadow-xs disabled:opacity-50"
                          >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(variant)}
                          className="text-[#c9963e] hover:text-[#9b7740] text-xs font-medium flex items-center justify-end gap-1 ml-auto"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
