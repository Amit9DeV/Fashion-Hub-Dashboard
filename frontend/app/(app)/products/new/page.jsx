"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, Image as ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/src/services/api";
import { toast } from "sonner";

const COMMON_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "28", "30", "32", "34", "36", "38", "40", "42", "6", "7", "8", "9", "10", "11", "12"];
const COMMON_COLORS = ["Black", "White", "Navy", "Grey", "Olive", "Red", "Blue", "Beige", "Cream", "Brown"];

export default function NewProductWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);

  // Form State
  const [basic, setBasic] = useState({ name: "", brandId: "", categoryId: "", description: "" });
  const [pricing, setPricing] = useState({ mrp: "", costPrice: "", sellingPrice: "" });
  const [matrix, setMatrix] = useState({ colors: [], sizes: [] });
  const [variants, setVariants] = useState([]);
  const [images, setImages] = useState([]);
  const [imageUrl, setImageUrl] = useState("");
  
  // Base SKU prefix for auto-generation
  const [skuPrefix, setSkuPrefix] = useState("");

  useEffect(() => {
    api.products.getMaster().then(res => {
      setBrands(res.brands || []);
      setCategories(res.categories || []);
    }).catch(console.error);
  }, []);

  // Generate SKU prefix when name/brand changes
  useEffect(() => {
    if (basic.name && basic.brandId) {
      const brand = brands.find(b => b._id === basic.brandId)?.name || "";
      const prefix = `${brand.substring(0,3).toUpperCase()}-${basic.name.substring(0,4).toUpperCase()}`.replace(/\s+/g, "");
      setSkuPrefix(prefix);
    }
  }, [basic.name, basic.brandId, brands]);

  // Generate variants when matrix or pricing changes
  useEffect(() => {
    if (matrix.colors.length === 0 && matrix.sizes.length === 0) {
      // Just one default variant
      setVariants([{
        sku: `${skuPrefix}-01`,
        color: "",
        size: "",
        mrp: pricing.mrp,
        costPrice: pricing.costPrice,
        sellingPrice: pricing.sellingPrice,
        stock: "0",
        barcode: ""
      }]);
      return;
    }

    const generated = [];
    const colors = matrix.colors.length > 0 ? matrix.colors : [""];
    const sizes = matrix.sizes.length > 0 ? matrix.sizes : [""];

    colors.forEach(color => {
      sizes.forEach(size => {
        const cCode = color.substring(0,3).toUpperCase();
        const sku = `${skuPrefix}-${cCode}-${size}`.replace(/-+/g, '-').replace(/-$/, '');
        
        generated.push({
          sku,
          color,
          size,
          mrp: pricing.mrp,
          costPrice: pricing.costPrice,
          sellingPrice: pricing.sellingPrice,
          stock: "0",
          barcode: ""
        });
      });
    });

    setVariants(generated);
  }, [matrix, pricing, skuPrefix]);

  const toggleColor = (color) => {
    setMatrix(prev => ({
      ...prev,
      colors: prev.colors.includes(color) ? prev.colors.filter(c => c !== color) : [...prev.colors, color]
    }));
  };

  const toggleSize = (size) => {
    setMatrix(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size) ? prev.sizes.filter(s => s !== size) : [...prev.sizes, size]
    }));
  };

  const handleVariantChange = (index, field, value) => {
    const updated = [...variants];
    updated[index][field] = value;
    setVariants(updated);
  };

  async function submit() {
    setBusy(true); setError("");
    
    // Validate
    if (!basic.name) return setError("Product name is required"), setBusy(false);
    if (variants.some(v => !v.sku)) return setError("All variants must have a SKU"), setBusy(false);

    try {
      const payload = {
        name: basic.name,
        brandId: basic.brandId,
        categoryId: basic.categoryId,
        description: basic.description,
        variants: variants,
        images: images.filter(Boolean),
      };

      const data = await api.products.create(payload);
      toast.success("Product created successfully");
      router.push(`/products/${data.product._id}`);
      router.refresh();
    } catch (err) {
      toast.error(err.message || "Failed to create product");
      setBusy(false);
    }
  }

  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
      {['Basic Info', 'Pricing', 'Variants', 'Images', 'Review'].map((label, i) => {
        const num = i + 1;
        const active = step === num;
        const passed = step > num;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors
              ${active ? 'bg-[#c9963e] text-white' : passed ? 'bg-[#e6f4ea] text-[#1e8e3e]' : 'bg-[#f5f4f0] text-[#a8a196]'}`}>
              {passed ? <CheckCircle2 size={16} /> : num}
            </div>
            <span className={`text-xs font-semibold uppercase tracking-wider hidden sm:block ${active ? 'text-[#0b0b0b]' : 'text-[#a8a196]'}`}>
              {label}
            </span>
            {num < 5 && <ChevronRight size={16} className="text-[#dfd8cc] mx-2" />}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-7 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/products" className="rounded-full bg-white p-2 hover:bg-gray-50 border shadow-sm">
          <ArrowLeft size={16} className="text-gray-600" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7740]">Product Catalog</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Create New Product</h2>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm sm:p-8">
        <StepIndicator />
        
        {error && (
          <div className="mb-6 rounded-md border border-[#e0ae9f] bg-[#fff0ec] px-4 py-3 text-sm text-[#8a2f20]">
            {error}
          </div>
        )}

        {/* STEP 1: BASIC INFO */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">Product Name *</label>
                <Input value={basic.name} onChange={e => setBasic({...basic, name: e.target.value})} placeholder="e.g. Signature Piqué Polo" className="h-11 font-medium text-lg" autoFocus />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">Brand</label>
                <select 
                  className="w-full h-11 rounded-md border bg-white px-3 text-sm focus:border-[#9b7740] focus:ring-1 focus:ring-[#9b7740] outline-none"
                  value={basic.brandId} onChange={async e => {
                    const val = e.target.value;
                    if (val === "ADD_NEW") {
                      const name = window.prompt("Enter new brand name:");
                      if (name) {
                        try {
                          const res = await api.products.createBrand(name);
                          setBrands([...brands, res.brand]);
                          setBasic({...basic, brandId: res.brand._id});
                        } catch (err) {
                          alert(err.message || "Failed to create brand");
                        }
                      }
                      return;
                    }
                    setBasic({...basic, brandId: val});
                  }}
                >
                  <option value="">Select Brand</option>
                  <option value="ADD_NEW">+ Add New Brand</option>
                  {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">Category</label>
                <select 
                  className="w-full h-11 rounded-md border bg-white px-3 text-sm focus:border-[#9b7740] focus:ring-1 focus:ring-[#9b7740] outline-none"
                  value={basic.categoryId} onChange={async e => {
                    const val = e.target.value;
                    if (val === "ADD_NEW") {
                      const name = window.prompt("Enter new category name:");
                      if (name) {
                        try {
                          const res = await api.products.createCategory(name);
                          setCategories([...categories, res.category]);
                          setBasic({...basic, categoryId: res.category._id});
                        } catch (err) {
                          alert(err.message || "Failed to create category");
                        }
                      }
                      return;
                    }
                    setBasic({...basic, categoryId: val});
                  }}
                >
                  <option value="">Select Category</option>
                  <option value="ADD_NEW">+ Add New Category</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">Description</label>
                <textarea 
                  className="w-full min-h-24 rounded-md border bg-white p-3 text-sm focus:border-[#9b7740] focus:ring-1 focus:ring-[#9b7740] outline-none"
                  value={basic.description} onChange={e => setBasic({...basic, description: e.target.value})}
                  placeholder="Fabric details, fit, wash care..."
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PRICING */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="rounded-lg border border-[#dfd8cc] bg-[#faf9f6] p-4 mb-6">
              <p className="text-sm text-[#706a61]"><span className="font-semibold text-[#0b0b0b]">Note:</span> This is the base pricing. It will be applied to all variants generated in the next step, but you can override individual variant prices later.</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">MRP (₹)</label>
                <Input type="number" step="0.01" value={pricing.mrp} onChange={e => setPricing({...pricing, mrp: e.target.value})} placeholder="1999.00" className="h-11 line-through text-gray-500" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">Selling Price (₹) *</label>
                <Input type="number" step="0.01" value={pricing.sellingPrice} onChange={e => setPricing({...pricing, sellingPrice: e.target.value})} placeholder="1499.00" className="h-11 font-bold text-[#c9963e]" autoFocus />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">Cost Price (₹)</label>
                <Input type="number" step="0.01" value={pricing.costPrice} onChange={e => setPricing({...pricing, costPrice: e.target.value})} placeholder="900.00" className="h-11" />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: VARIANTS */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Colors */}
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">Select Colors</label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_COLORS.map(color => (
                    <button 
                      key={color} type="button"
                      onClick={() => toggleColor(color)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${matrix.colors.includes(color) ? 'bg-[#0b0b0b] text-white border-[#0b0b0b]' : 'bg-white text-gray-700 hover:border-gray-400'}`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
              {/* Sizes */}
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">Select Sizes</label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SIZES.map(size => (
                    <button 
                      key={size} type="button"
                      onClick={() => toggleSize(size)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${matrix.sizes.includes(size) ? 'bg-[#c9963e] text-white border-[#c9963e]' : 'bg-white text-gray-700 hover:border-gray-400'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">Generated Variants <span className="rounded-full bg-[#f0ede7] px-2 py-0.5 text-[10px] text-[#5f584e]">{variants.length}</span></h3>
                <div className="text-xs text-gray-500 flex items-center gap-1"><Sparkles size={12} className="text-[#c9963e]"/> SKUs auto-generated based on prefix: <strong className="font-mono">{skuPrefix}</strong></div>
              </div>
              
              <div className="rounded-lg border bg-white shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[800px]">
                  <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-[#81796d] border-b">
                    <tr>
                      <th className="px-4 py-3">Color/Size</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Barcode</th>
                      <th className="px-4 py-3">Selling Price</th>
                      <th className="px-4 py-3">Op. Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ede7]">
                    {variants.map((v, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">
                          {v.color} {v.size && <span className="font-bold bg-gray-100 rounded px-1.5 py-0.5 ml-1">{v.size}</span>}
                          {(!v.color && !v.size) && <span className="text-gray-400 italic">Default</span>}
                        </td>
                        <td className="px-4 py-2"><Input value={v.sku} onChange={e => handleVariantChange(i, 'sku', e.target.value)} className="h-8 text-xs font-mono w-32" /></td>
                        <td className="px-4 py-2"><Input value={v.barcode} onChange={e => handleVariantChange(i, 'barcode', e.target.value)} className="h-8 text-xs font-mono w-32" placeholder="Scan..." /></td>
                        <td className="px-4 py-2"><Input type="number" step="0.01" value={v.sellingPrice} onChange={e => handleVariantChange(i, 'sellingPrice', e.target.value)} className="h-8 text-xs w-24 text-right" /></td>
                        <td className="px-4 py-2"><Input type="number" value={v.stock} onChange={e => handleVariantChange(i, 'stock', e.target.value)} className="h-8 text-xs w-20 text-right" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: IMAGES */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b pb-4 mb-4">
                <ImageIcon className="text-[#c9963e]" size={24} />
                <div>
                  <h3 className="font-semibold text-lg">Product Images</h3>
                  <p className="text-xs text-[#706a61]">Add URLs for product photos or catalog imagery.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Enter image URL (e.g. https://images.unsplash.com/...)"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (imageUrl.trim()) {
                          setImages([...images, imageUrl.trim()]);
                          setImageUrl("");
                        }
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="gold"
                    onClick={() => {
                      if (imageUrl.trim()) {
                        setImages([...images, imageUrl.trim()]);
                        setImageUrl("");
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>

                {images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative group rounded-md border overflow-hidden aspect-square bg-[#faf9f6]">
                        <img src={img} alt={`Product preview ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImages(images.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 text-xs transition-colors"
                          title="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-[#dfd8cc] p-8 text-center bg-[#faf9f6]">
                    <ImageIcon className="mx-auto text-[#c2bcaf] mb-2" size={32} />
                    <p className="text-sm text-[#706a61]">No images added yet.</p>
                    <p className="text-xs text-[#8a847a] mt-1">Paste a link above or continue without an image (can be added later).</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="rounded-xl border bg-[#faf9f6] p-6 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[#81796d] mb-4">Summary</h3>
              
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-semibold text-lg">{basic.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Brand / Category</p>
                  <p className="font-medium">
                    {brands.find(b => b._id === basic.brandId)?.name || "No Brand"} &rarr; {categories.find(c => c._id === basic.categoryId)?.name || "No Category"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Variants Generated</p>
                  <p className="font-semibold text-xl text-[#c9963e]">{variants.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Base Selling Price</p>
                  <p className="font-semibold text-xl">₹{pricing.sellingPrice || "0.00"}</p>
                </div>
                {images.length > 0 && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-gray-500 mb-2">Images ({images.length})</p>
                    <div className="flex gap-2">
                      {images.map((img, i) => (
                        <img key={i} src={img} alt="Thumb" className="size-12 rounded object-cover border" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[#c9963e] bg-[#fffbf2] p-4 text-center">
              <Sparkles className="mx-auto text-[#c9963e] mb-2" size={24} />
              <p className="font-medium text-[#7a5820]">You are about to create this product and generate {variants.length} SKU(s).</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-10 flex items-center justify-between border-t pt-6">
          <Button type="button" variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 1 || busy}>
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
          
          {step < 5 ? (
            <Button type="button" variant="gold" onClick={() => {
              if (step === 1 && !basic.name) return setError("Product name is required");
              if (step === 2 && !pricing.sellingPrice) return setError("Selling price is required");
              setError("");
              setStep(step + 1);
            }}>
              Next Step <ArrowRight size={16} className="ml-2" />
            </Button>
          ) : (
            <Button type="button" variant="gold" onClick={submit} disabled={busy} className="px-8 shadow-md">
              {busy ? "Creating..." : "Create Product"} <CheckCircle2 size={16} className="ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
