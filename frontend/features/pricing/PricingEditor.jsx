"use client";

import { useState, useMemo } from "react";
import { Check, Edit2, Loader2, Save, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/src/services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function PricingEditor({ initialVariants }) {
  const [variants, setVariants] = useState(initialVariants);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ costPrice: "", mrp: "", sellingPrice: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVariants = useMemo(() => {
    if (!searchQuery.trim()) return variants;
    const q = searchQuery.toLowerCase();
    return variants.filter(v => {
      const searchString = `${v.productName} ${v.sku} ${v.color} ${v.size}`.toLowerCase();
      return searchString.includes(q);
    });
  }, [variants, searchQuery]);

  function startEdit(variant) {
    setEditingId(variant._id);
    setDraft({
      costPrice: variant.costPricePaisa ? (variant.costPricePaisa / 100).toString() : "",
      mrp: variant.mrpPaisa ? (variant.mrpPaisa / 100).toString() : "",
      sellingPrice: variant.sellingPricePaisa ? (variant.sellingPricePaisa / 100).toString() : "",
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
      
      const res = await api.products.updateVariant(variant.productId, variant._id, payload);
      
      // Update local state to reflect changes immediately
      setVariants(current => current.map(v => {
        if (v._id === variant._id) {
          return {
            ...v,
            costPricePaisa: payload.costPrice ? Math.round(parseFloat(payload.costPrice) * 100) : v.costPricePaisa,
            mrpPaisa: payload.mrp ? Math.round(parseFloat(payload.mrp) * 100) : v.mrpPaisa,
            sellingPricePaisa: payload.sellingPrice ? Math.round(parseFloat(payload.sellingPrice) * 100) : v.sellingPricePaisa,
          };
        }
        return v;
      }));
      
      toast.success("Pricing updated successfully");
      setEditingId(null);
    } catch (err) {
      setError(err.message || "Failed to save pricing.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-md border bg-white shadow-sm overflow-hidden">
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-5 py-3 text-sm text-red-700 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")}><X size={16} /></button>
        </div>
      )}
      
      <div className="p-4 border-b border-[#f0ede7] bg-white">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8a847a]" />
          <Input 
            placeholder="Search by product name, SKU, or attribute..." 
            className="pl-9 h-9 text-sm focus-visible:ring-[#c9963e]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-[#81796d]">
            <tr>
              <th className="px-5 py-3 font-semibold">Product & Variant</th>
              <th className="px-5 py-3 font-semibold text-right">Cost Price (₹)</th>
              <th className="px-5 py-3 font-semibold text-right">MRP (₹)</th>
              <th className="px-5 py-3 font-semibold text-right">Selling Price (₹)</th>
              <th className="px-5 py-3 font-semibold text-right w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0ede7]">
            {filteredVariants.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[#706a61]">
                  {searchQuery ? "No products found matching your search." : "No products available in catalog."}
                </td>
              </tr>
            ) : (
              filteredVariants.map(variant => {
                const isEditing = editingId === variant._id;
                const variantSubName = [variant.color, variant.size, variant.sku].filter(Boolean).join(" · ");
                
                return (
                  <tr key={variant._id} className={cn("transition-colors", isEditing ? "bg-[#fffaf0]" : "hover:bg-[#faf9f6]")}>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-[#0b0b0b]">{variant.productName}</p>
                      <p className="text-xs text-[#706a61] mt-0.5">{variantSubName || "Base Variant"}</p>
                    </td>
                    
                    <td className="px-5 py-3.5 text-right">
                      {isEditing ? (
                        <Input 
                          type="number" 
                          className="w-24 ml-auto h-8 text-right bg-white"
                          value={draft.costPrice}
                          onChange={e => setDraft({...draft, costPrice: e.target.value})}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit(variant);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          placeholder="0.00"
                        />
                      ) : (
                        <span className="font-financial text-[#706a61]">
                          {variant.costPricePaisa ? (variant.costPricePaisa / 100).toFixed(2) : "-"}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      {isEditing ? (
                        <Input 
                          type="number" 
                          className="w-24 ml-auto h-8 text-right bg-white"
                          value={draft.mrp}
                          onChange={e => setDraft({...draft, mrp: e.target.value})}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit(variant);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          placeholder="0.00"
                        />
                      ) : (
                        <span className="font-financial text-[#706a61]">
                          {variant.mrpPaisa ? (variant.mrpPaisa / 100).toFixed(2) : "-"}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      {isEditing ? (
                        <Input 
                          type="number" 
                          className="w-24 ml-auto h-8 text-right bg-white font-semibold focus-visible:ring-[#c9963e]"
                          value={draft.sellingPrice}
                          onChange={e => setDraft({...draft, sellingPrice: e.target.value})}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit(variant);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          placeholder="0.00"
                        />
                      ) : (
                        <span className="font-financial font-semibold text-[#1a6b3a]">
                          {variant.sellingPricePaisa ? (variant.sellingPricePaisa / 100).toFixed(2) : "-"}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={cancelEdit} disabled={isSaving} className="p-1.5 text-gray-400 hover:text-gray-700 bg-white border rounded shadow-sm disabled:opacity-50">
                            <X size={14} />
                          </button>
                          <button onClick={() => saveEdit(variant)} disabled={isSaving} className="p-1.5 text-white bg-[#c9963e] hover:bg-[#b08030] rounded shadow-sm disabled:opacity-50">
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(variant)} className="text-[#c9963e] hover:text-[#9b7740] text-xs font-medium flex items-center justify-end gap-1 ml-auto">
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
