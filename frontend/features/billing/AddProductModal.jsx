"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/src/services/api";
import { toast } from "sonner";

export function AddProductModal({ isOpen, onClose, onProductAdded, initialQuery }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newBrandName, setNewBrandName] = useState("");
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const [form, setForm] = useState({
    name: initialQuery || "",
    brandId: "",
    categoryId: "",
    mrp: "",
    sellingPrice: "",
    costPrice: "",
    stock: "1",
    sku: "",
    barcode: "",
  });

  useEffect(() => {
    if (isOpen) {
      setForm(prev => ({ ...prev, name: initialQuery || "" }));
      api.products.getMaster().then(res => {
        setBrands(res.brands || []);
        setCategories(res.categories || []);
      }).catch(console.error);
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveNewBrand = async () => {
    if (!newBrandName.trim()) return;
    try {
      const res = await api.products.createBrand(newBrandName.trim());
      setBrands(prev => [...prev, res.brand]);
      setForm(prev => ({ ...prev, brandId: res.brand._id }));
      setNewBrandName("");
      setIsAddingBrand(false);
      toast.success("Brand added");
    } catch (err) {
      toast.error(err.message || "Failed to create brand");
    }
  };

  const handleSaveNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await api.products.createCategory(newCategoryName.trim());
      setCategories(prev => [...prev, res.category]);
      setForm(prev => ({ ...prev, categoryId: res.category._id }));
      setNewCategoryName("");
      setIsAddingCategory(false);
      toast.success("Category added");
    } catch (err) {
      toast.error(err.message || "Failed to create category");
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true); setError("");

    if (!form.name) return setError("Product name is required"), setBusy(false);
    if (!form.sellingPrice) return setError("Selling price is required"), setBusy(false);

    try {
      let finalSku = form.sku;
      if (!finalSku) {
        const brand = brands.find(b => b._id === form.brandId)?.name || "GEN";
        const prefix = `${brand.substring(0,3).toUpperCase()}-${form.name.substring(0,4).toUpperCase()}`.replace(/\s+/g, "");
        finalSku = `${prefix}-01`;
      }

      const payload = {
        name: form.name,
        brandId: form.brandId || null,
        categoryId: form.categoryId || null,
        description: "",
        variants: [{
          sku: finalSku,
          color: "",
          size: "",
          mrp: form.mrp || form.sellingPrice,
          costPrice: form.costPrice || "0",
          sellingPrice: form.sellingPrice,
          stock: form.stock || "0",
          barcode: form.barcode || "",
        }]
      };

      const data = await api.products.create(payload);
      const newProduct = data.product;
      const prodDetails = await api.products.getById(newProduct._id);
      const variant = prodDetails.product.variants[0];
      
      const cartItem = {
        productId: newProduct._id.toString(),
        variantId: variant._id.toString(),
        productName: newProduct.name,
        brand: newProduct.brandSnapshot,
        category: newProduct.categorySnapshot,
        sku: variant.sku,
        barcode: variant.barcode,
        color: variant.color,
        size: variant.size,
        mrpPaisa: variant.mrpPaisa,
        sellingPricePaisa: variant.sellingPricePaisa,
        stock: variant.stock,
      };

      onProductAdded(cartItem);
      toast.success("Product created successfully");
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to create product");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-5 animate-in fade-in duration-150" onClick={onClose}>
      <div 
        className="w-full max-w-lg rounded-md bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-modal-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b bg-[#faf9f6] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Quick Add Product</h2>
            <p className="text-xs text-[#706a61]">Add a new product directly to the bill.</p>
          </div>
          <button onClick={onClose} className="text-[#8a847a] hover:text-[#0b0b0b]"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto p-5">
          {error && (
            <div className="mb-4 rounded-md border border-[#e0ae9f] bg-[#fff0ec] px-4 py-3 text-sm text-[#8a2f20]">
              {error}
            </div>
          )}

          <form id="add-product-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">Product Name *</label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. White T-Shirt" className="h-10" autoFocus />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">Brand</label>
                  {!isAddingBrand && (
                    <button
                      type="button"
                      onClick={() => setIsAddingBrand(true)}
                      className="text-xs text-[#9b7740] hover:underline font-medium"
                    >
                      + Add
                    </button>
                  )}
                </div>
                {isAddingBrand ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      placeholder="Brand name"
                      className="h-10 text-xs bg-white"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveNewBrand();
                        } else if (e.key === "Escape") {
                          setIsAddingBrand(false);
                        }
                      }}
                    />
                    <Button type="button" size="sm" variant="gold" className="h-10 px-2.5 text-xs" onClick={handleSaveNewBrand}>
                      Save
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-10 px-2 text-xs" onClick={() => setIsAddingBrand(false)}>
                      ✕
                    </Button>
                  </div>
                ) : (
                  <select 
                    className="w-full h-10 rounded-md border bg-white px-3 text-sm focus:border-[#9b7740] outline-none"
                    value={form.brandId}
                    onChange={(e) => {
                      if (e.target.value === "ADD_NEW") {
                        setIsAddingBrand(true);
                      } else {
                        setForm({ ...form, brandId: e.target.value });
                      }
                    }}
                  >
                    <option value="">Select Brand</option>
                    <option value="ADD_NEW">+ Add New Brand</option>
                    {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">Category</label>
                  {!isAddingCategory && (
                    <button
                      type="button"
                      onClick={() => setIsAddingCategory(true)}
                      className="text-xs text-[#9b7740] hover:underline font-medium"
                    >
                      + Add
                    </button>
                  )}
                </div>
                {isAddingCategory ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
                      className="h-10 text-xs bg-white"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveNewCategory();
                        } else if (e.key === "Escape") {
                          setIsAddingCategory(false);
                        }
                      }}
                    />
                    <Button type="button" size="sm" variant="gold" className="h-10 px-2.5 text-xs" onClick={handleSaveNewCategory}>
                      Save
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-10 px-2 text-xs" onClick={() => setIsAddingCategory(false)}>
                      ✕
                    </Button>
                  </div>
                ) : (
                  <select 
                    className="w-full h-10 rounded-md border bg-white px-3 text-sm focus:border-[#9b7740] outline-none"
                    value={form.categoryId}
                    onChange={(e) => {
                      if (e.target.value === "ADD_NEW") {
                        setIsAddingCategory(true);
                      } else {
                        setForm({ ...form, categoryId: e.target.value });
                      }
                    }}
                  >
                    <option value="">Select Category</option>
                    <option value="ADD_NEW">+ Add New Category</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">Selling Price (₹) *</label>
                <Input type="number" step="0.01" value={form.sellingPrice} onChange={e => setForm({...form, sellingPrice: e.target.value})} placeholder="0.00" className="h-10 font-bold text-[#c9963e]" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">MRP (₹)</label>
                <Input type="number" step="0.01" value={form.mrp} onChange={e => setForm({...form, mrp: e.target.value})} placeholder="0.00" className="h-10" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">Initial Stock</label>
                <Input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} placeholder="1" className="h-10" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">Barcode (Optional)</label>
                <Input value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} placeholder="Scan barcode" className="h-10" />
              </div>
            </div>
          </form>
        </div>

        <div className="border-t bg-[#faf9f6] px-5 py-4 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" form="add-product-form" variant="gold" disabled={busy}>
            {busy ? "Saving..." : "Save & Add to Bill"} <CheckCircle2 size={16} className="ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
