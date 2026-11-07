"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/src/services/api";
import { toast } from "sonner";
import { ArrowLeft, Box, BarChart3, List, Settings, TrendingUp, PackageSearch, Plus, Image as ImageIcon, Printer, UploadCloud, Loader2, History, ArrowDownRight, ArrowUpRight, FileText } from "lucide-react";
import BarcodePrintModal from "@/components/products/BarcodePrintModal";
import InvoiceModal from "@/components/invoice/InvoiceModal";
import { readFileAsOptimizedDataUrl } from "@/lib/image-utils";

export default function ProductDetailPage(props) {
  const params = use(props.params);
  const router = useRouter();
  
  const [product, setProduct] = useState(null);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  
  // Forms
  const [editingBasic, setEditingBasic] = useState(false);
  const [basicForm, setBasicForm] = useState({});
  const [editingVariantId, setEditingVariantId] = useState(null);
  const [variantForm, setVariantForm] = useState({});
  const [addingVariant, setAddingVariant] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [savingImage, setSavingImage] = useState(false);

  // Live Audit Movements and Sales
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [salesHistory, setSalesHistory] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  useEffect(() => {
    if (activeTab === "inventory" && movements.length === 0) {
      setLoadingMovements(true);
      api.products.getMovements(params.id)
        .then((res) => setMovements(res?.movements || []))
        .catch(console.error)
        .finally(() => setLoadingMovements(false));
    } else if (activeTab === "sales" && salesHistory.length === 0) {
      setLoadingSales(true);
      api.products.getSales(params.id)
        .then((res) => setSalesHistory(res?.sales || []))
        .catch(console.error)
        .finally(() => setLoadingSales(false));
    }
  }, [activeTab, params.id, movements.length, salesHistory.length]);

  useEffect(() => {
    Promise.all([
      api.products.getById(params.id),
      api.products.getMaster()
    ])
    .then(([productData, masterData]) => {
      setProduct(productData.product);
      setBrands(masterData.brands || []);
      setCategories(masterData.categories || []);
      
      setBasicForm({
        name: productData.product.name || "",
        brandId: productData.product.brandId || "",
        categoryId: productData.product.categoryId || "",
        description: productData.product.description || "",
        status: productData.product.status || "ACTIVE"
      });
      setLoading(false);
    })
    .catch((err) => {
      console.error(err);
      router.push("/products");
    });
  }, [params.id, router]);

  async function handleUpdateBasic(e) {
    e.preventDefault();
    try {
      const data = await api.products.update(product._id, basicForm);
      setProduct(prev => ({ ...prev, ...data.product }));
      setEditingBasic(false);
      toast.success("Product details updated successfully");
    } catch (err) {
      toast.error(err.message || "Failed to update product");
    }
  }

  function startEditVariant(variant) {
    setVariantForm({
      sku: variant.sku,
      barcode: variant.barcode || "",
      color: variant.color || "",
      size: variant.size || "",
      costPrice: (variant.costPricePaisa / 100).toFixed(2),
      mrp: (variant.mrpPaisa / 100).toFixed(2),
      sellingPrice: (variant.sellingPricePaisa / 100).toFixed(2),
      stock: variant.stock,
      status: variant.status
    });
    setEditingVariantId(variant._id);
  }

  async function handleUpdateVariant(variantId) {
    try {
      const data = await api.products.updateVariant(product._id, variantId, variantForm);
      // Update local state
      setProduct(prev => {
        const variants = prev.variants.map(v => v._id === variantId ? data.variant : v);
        return { ...prev, variants };
      });
      setEditingVariantId(null);
      toast.success("Variant updated successfully");
    } catch (err) {
      toast.error(err.message || "Failed to update variant");
    }
  }

  async function handleAddVariant(e) {
    e.preventDefault();
    setAddingVariant(true);
    const formData = new FormData(e.target);
    const payload = {
      sku: formData.get("sku"),
      barcode: formData.get("barcode"),
      color: formData.get("color"),
      size: formData.get("size"),
      costPrice: formData.get("costPrice"),
      mrp: formData.get("mrp"),
      sellingPrice: formData.get("sellingPrice"),
      stock: formData.get("stock"),
    };

    try {
      const data = await api.products.addVariant(product._id, payload);
      setProduct(prev => ({
        ...prev,
        variants: [...(prev.variants || []), data.variant]
      }));
      e.target.reset();
      toast.success("Variant added successfully");
    } catch (err) {
      toast.error(err.message || "Failed to add variant");
    } finally {
      setAddingVariant(false);
    }
  }

  async function handleDeleteProduct() {
    if (!confirm("Are you sure you want to delete this product? All variants will also be deleted. This cannot be undone.")) return;
    try {
      await api.products.delete(product._id);
      toast.success("Product deleted successfully");
      router.push("/products");
    } catch (err) {
      toast.error(err.message || "Failed to delete product");
    }
  }

  async function handleDeleteVariant(variantId) {
    if (!confirm("Are you sure you want to delete this variant? This cannot be undone.")) return;
    try {
      await api.products.deleteVariant(product._id, variantId);
      setProduct(prev => ({
        ...prev,
        variants: prev.variants.filter(v => v._id !== variantId)
      }));
      toast.success("Variant deleted successfully");
    } catch (err) {
      toast.error(err.message || "Failed to delete variant");
    }
  }

  async function handleAddImage(e) {
    if (e) e.preventDefault();
    if (!newImageUrl.trim()) return;
    setSavingImage(true);
    try {
      const updatedImages = [...(product.images || []), newImageUrl.trim()];
      await api.products.update(product._id, { images: updatedImages });
      setProduct(prev => ({ ...prev, images: updatedImages }));
      setNewImageUrl("");
      toast.success("Image added successfully");
    } catch (err) {
      toast.error(err.message || "Failed to add image");
    } finally {
      setSavingImage(false);
    }
  }

  async function handleUploadLocalFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setSavingImage(true);
    try {
      const newUrls = [];
      for (const file of files) {
        const dataUrl = await readFileAsOptimizedDataUrl(file);
        newUrls.push(dataUrl);
      }
      const updatedImages = [...(product.images || []), ...newUrls];
      await api.products.update(product._id, { images: updatedImages });
      setProduct(prev => ({ ...prev, images: updatedImages }));
      toast.success(`${newUrls.length} image(s) uploaded successfully`);
    } catch (err) {
      toast.error(err.message || "Failed to upload image(s)");
    } finally {
      setSavingImage(false);
      e.target.value = "";
    }
  }

  async function handleDeleteImage(index) {
    if (!confirm("Are you sure you want to remove this image?")) return;
    try {
      const updatedImages = (product.images || []).filter((_, i) => i !== index);
      await api.products.update(product._id, { images: updatedImages });
      setProduct(prev => ({ ...prev, images: updatedImages }));
      toast.success("Image removed successfully");
    } catch (err) {
      toast.error(err.message || "Failed to remove image");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c9963e]"></div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <Link href="/products" className="inline-flex items-center text-xs font-semibold uppercase tracking-widest text-[#81796d] hover:text-[#0b0b0b] transition-colors mb-4">
          <ArrowLeft size={14} className="mr-2" /> Back to Catalog
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end justify-between border-b border-[#dfd8cc] pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${product.status === 'ACTIVE' ? 'bg-[#e6f4ea] text-[#1e8e3e]' : product.status === 'DRAFT' ? 'bg-gray-100 text-gray-600' : 'bg-[#fce8e6] text-[#d93025]'}`}>
                {product.status}
              </span>
              <p className="text-sm font-medium text-[#706a61]">{product.brandSnapshot || "No Brand"}</p>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#0b0b0b] break-words">{product.name}</h2>
            <p className="text-sm text-[#706a61] mt-1">{product.categorySnapshot}</p>
          </div>
          <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
            <Button
              variant="outline"
              className="flex-1 sm:flex-initial justify-center gap-1.5 border-[#d8c3a5] text-[#2c2724] hover:bg-[#faf7f2]"
              onClick={() => setIsBarcodeModalOpen(true)}
              title="Generate and print barcode label sheet"
            >
              <Printer size={15} className="text-[#c9963e]" />
              Print Barcodes
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-initial justify-center" onClick={() => {
              if (editingBasic) {
                setBasicForm({
                  name: product.name || "",
                  brandId: product.brandId || "",
                  categoryId: product.categoryId || "",
                  description: product.description || "",
                  status: product.status || "ACTIVE"
                });
                setEditingBasic(false);
              } else {
                setActiveTab("overview");
                setEditingBasic(true);
              }
            }}>
              {editingBasic ? "Cancel Edit" : "Edit Details"}
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct} className="flex-1 sm:flex-initial justify-center bg-red-50 text-red-600 border border-red-100 hover:bg-red-100">
              Delete Product
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 sm:gap-6 border-b border-[#dfd8cc] overflow-x-auto no-scrollbar">
        <button 
          className={`pb-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'border-[#0b0b0b] text-[#0b0b0b]' : 'border-transparent text-[#81796d] hover:text-[#0b0b0b]'}`}
          onClick={() => setActiveTab('overview')}
        >
          <Settings size={16} /> Overview
        </button>
        <button 
          className={`pb-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'variants' ? 'border-[#0b0b0b] text-[#0b0b0b]' : 'border-transparent text-[#81796d] hover:text-[#0b0b0b]'}`}
          onClick={() => setActiveTab('variants')}
        >
          <List size={16} /> Variants <span className="ml-1 rounded-full bg-[#f0ede7] px-2 py-0.5 text-[10px] text-[#5f584e]">{product.variants?.length || 0}</span>
        </button>
        <button 
          className={`pb-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'inventory' ? 'border-[#0b0b0b] text-[#0b0b0b]' : 'border-transparent text-[#81796d] hover:text-[#0b0b0b]'}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Box size={16} /> Inventory Log
        </button>
        <button 
          className={`pb-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'sales' ? 'border-[#0b0b0b] text-[#0b0b0b]' : 'border-transparent text-[#81796d] hover:text-[#0b0b0b]'}`}
          onClick={() => setActiveTab('sales')}
        >
          <TrendingUp size={16} /> Sales History
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              {editingBasic ? (
                <form onSubmit={handleUpdateBasic} className="space-y-6 rounded-xl border bg-white p-6 shadow-sm">
                  <h3 className="font-semibold text-lg">Edit Master Details</h3>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">Product Name</label>
                      <Input value={basicForm.name} onChange={(e) => setBasicForm({...basicForm, name: e.target.value})} required className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">Brand</label>
                      <select 
                        className="w-full h-11 rounded-md border bg-white px-3 text-sm focus:border-[#9b7740] focus:ring-1 focus:ring-[#9b7740] outline-none"
                        value={basicForm.brandId} 
                        onChange={(e) => setBasicForm({...basicForm, brandId: e.target.value})}
                      >
                        <option value="">Select Brand</option>
                        {brands.map(b => (
                          <option key={b._id} value={b._id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">Category</label>
                      <select 
                        className="w-full h-11 rounded-md border bg-white px-3 text-sm focus:border-[#9b7740] focus:ring-1 focus:ring-[#9b7740] outline-none"
                        value={basicForm.categoryId} 
                        onChange={(e) => setBasicForm({...basicForm, categoryId: e.target.value})}
                      >
                        <option value="">Select Category</option>
                        {categories.map(c => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">Description</label>
                      <textarea 
                        className="w-full min-h-24 rounded-md border bg-white p-3 text-sm focus:border-[#9b7740] focus:ring-1 focus:ring-[#9b7740] outline-none"
                        value={basicForm.description} 
                        onChange={(e) => setBasicForm({...basicForm, description: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-widest text-[#5f584e]">Status</label>
                      <select 
                        className="w-full h-11 rounded-md border bg-white px-3 text-sm focus:border-[#9b7740] focus:ring-1 focus:ring-[#9b7740] outline-none"
                        value={basicForm.status} 
                        onChange={(e) => setBasicForm({...basicForm, status: e.target.value})}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="DRAFT">DRAFT</option>
                        <option value="ARCHIVED">ARCHIVED</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end border-t pt-5">
                    <Button type="submit" variant="gold" className="px-8">Save Details</Button>
                  </div>
                </form>
              ) : (
                <div className="rounded-xl border bg-white p-6 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-[#81796d]">Description</h3>
                    <p className="mt-2 text-sm text-[#0b0b0b] leading-relaxed">
                      {product.description || <span className="italic text-gray-400">No description provided.</span>}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#81796d]">Brand</p>
                      <p className="mt-1 font-medium">{product.brandSnapshot || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#81796d]">Category</p>
                      <p className="mt-1 font-medium">{product.categorySnapshot || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#81796d]">Date Created</p>
                      <p className="mt-1 font-medium">{new Date(product.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#81796d]">System ID</p>
                      <p className="mt-1 font-mono text-xs text-gray-500">{product._id}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-6">
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                  <h3 className="font-semibold text-lg text-[#0b0b0b]">Product Images</h3>
                  <span className="text-xs text-[#8a847a]">
                    {product.images?.length || 0} image{product.images?.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Existing Images Gallery */}
                {product.images && product.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {product.images.map((img, idx) => (
                      <div key={idx} className="relative group rounded-lg border overflow-hidden aspect-square bg-[#faf9f6]">
                        <img src={img} alt={`${product.name} - ${idx + 1}`} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute top-1.5 left-1.5 bg-[#0b0b0b]/80 text-[#d8b46a] text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase">
                            Primary
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(idx)}
                          className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="aspect-video bg-[#f5f4f0] rounded-lg border border-dashed border-[#c2bcaf] flex flex-col items-center justify-center text-[#81796d] gap-2 mb-4">
                    <ImageIcon size={32} className="text-[#c2bcaf]" />
                    <p className="text-sm font-medium">No images uploaded</p>
                    <p className="text-xs text-[#8a847a]">Add product photos below</p>
                  </div>
                )}

                {/* Add Image Section */}
                <div className="space-y-4 pt-2 border-t border-[#f0ede7]">
                  {/* Upload Local File Box */}
                  <div className="rounded-lg border-2 border-dashed border-[#dfd8cc] p-5 text-center bg-[#faf9f6] hover:bg-[#f6f3ed] transition-colors relative">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      id="edit-product-file-upload"
                      className="hidden"
                      onChange={handleUploadLocalFiles}
                      disabled={savingImage}
                    />
                    <label htmlFor="edit-product-file-upload" className="cursor-pointer block">
                      {savingImage ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="animate-spin text-[#c9963e] mb-2" size={28} />
                          <p className="text-sm font-semibold text-[#0b0b0b]">Processing & Saving Images...</p>
                        </div>
                      ) : (
                        <>
                          <UploadCloud className="mx-auto text-[#c9963e] mb-1.5" size={28} />
                          <p className="text-sm font-semibold text-[#0b0b0b]">Upload Local Photos</p>
                          <p className="text-[11px] text-[#8a847a] mt-0.5">Click to choose image files from computer or phone</p>
                        </>
                      )}
                    </label>
                  </div>

                  <div className="relative flex items-center justify-center my-1">
                    <div className="border-t border-[#dfd8cc] w-full"></div>
                    <span className="bg-white px-2.5 text-[10px] text-[#8a847a] uppercase font-semibold">Or enter image URL</span>
                  </div>

                  <form onSubmit={handleAddImage} className="space-y-1.5">
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://images.unsplash.com/..."
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        className="h-9 text-xs"
                      />
                      <Button
                        type="submit"
                        variant="gold"
                        size="sm"
                        disabled={savingImage || !newImageUrl.trim()}
                        className="h-9 text-xs px-4 shrink-0"
                      >
                        {savingImage ? "Adding..." : "Add"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VARIANTS TAB */}
        {activeTab === 'variants' && (
          <div className="space-y-6">
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-[#81796d] border-b">
                    <tr>
                      <th className="px-5 py-4 font-semibold">SKU / Barcode</th>
                      <th className="px-5 py-4 font-semibold">Color / Size</th>
                      <th className="px-5 py-4 font-semibold text-right">Cost (₹)</th>
                      <th className="px-5 py-4 font-semibold text-right">MRP (₹)</th>
                      <th className="px-5 py-4 font-semibold text-right">Selling (₹)</th>
                      <th className="px-5 py-4 font-semibold text-right">Profit</th>
                      <th className="px-5 py-4 font-semibold text-right">Stock</th>
                      <th className="px-5 py-4 font-semibold text-center">Status</th>
                      <th className="px-5 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ede7]">
                    {(product.variants || []).map((variant) => {
                      const cost = variant.costPricePaisa || 0;
                      const selling = variant.sellingPricePaisa || 0;
                      const profitPaisa = selling - cost;
                      const profitMargin = selling > 0 ? ((profitPaisa / selling) * 100).toFixed(1) : 0;
                      
                      return editingVariantId === variant._id ? (
                        <tr key={variant._id} className="bg-[#fdfcfb]">
                          <td className="px-5 py-3 space-y-1.5 min-w-[160px]">
                            <Input value={variantForm.sku} onChange={(e) => setVariantForm({...variantForm, sku: e.target.value})} placeholder="SKU" className="h-8 text-xs font-mono" />
                            <Input value={variantForm.barcode} onChange={(e) => setVariantForm({...variantForm, barcode: e.target.value})} placeholder="Barcode" className="h-8 text-xs font-mono" />
                          </td>
                          <td className="px-5 py-3 space-y-1.5 min-w-[100px]">
                            <Input value={variantForm.color} onChange={(e) => setVariantForm({...variantForm, color: e.target.value})} placeholder="Color" className="h-8 text-xs" />
                            <Input value={variantForm.size} onChange={(e) => setVariantForm({...variantForm, size: e.target.value})} placeholder="Size" className="h-8 text-xs font-bold" />
                          </td>
                          <td className="px-5 py-3 min-w-[100px]">
                            <Input type="number" step="0.01" value={variantForm.costPrice} onChange={(e) => setVariantForm({...variantForm, costPrice: e.target.value})} className="h-8 text-xs text-right" />
                          </td>
                          <td className="px-5 py-3 min-w-[100px]">
                            <Input type="number" step="0.01" value={variantForm.mrp} onChange={(e) => setVariantForm({...variantForm, mrp: e.target.value})} className="h-8 text-xs text-right" />
                          </td>
                          <td className="px-5 py-3 min-w-[100px]">
                            <Input type="number" step="0.01" value={variantForm.sellingPrice} onChange={(e) => setVariantForm({...variantForm, sellingPrice: e.target.value})} className="h-8 text-xs text-right text-[#c9963e] font-bold" />
                          </td>
                          <td className="px-5 py-3 text-right text-xs text-gray-400 italic">Auto</td>
                          <td className="px-5 py-3 min-w-[90px]">
                            <Input type="number" value={variantForm.stock} onChange={(e) => setVariantForm({...variantForm, stock: e.target.value})} className="h-8 text-xs text-right" />
                          </td>
                          <td className="px-5 py-3 min-w-[110px]">
                            <select 
                              className="w-full h-8 rounded border bg-white px-2 text-[10px] font-bold"
                              value={variantForm.status} 
                              onChange={(e) => setVariantForm({...variantForm, status: e.target.value})}
                            >
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="INACTIVE">INACTIVE</option>
                            </select>
                          </td>
                          <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                            <Button size="sm" variant="gold" className="h-8 px-3 text-xs" onClick={() => handleUpdateVariant(variant._id)}>Save</Button>
                            <Button size="sm" variant="outline" className="h-8 px-3 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => setEditingVariantId(null)}>Cancel</Button>
                          </td>
                        </tr>
                      ) : (
                        <tr key={variant._id} className="hover:bg-[#faf9f6] transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-mono text-xs font-bold text-[#0b0b0b]">{variant.sku}</div>
                            <div className="text-[10px] text-[#81796d] mt-1 flex items-center gap-1">
                              <BarChart3 size={10} /> {variant.barcode || "No Barcode"}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-medium">{variant.color || "-"}</div>
                            <div className="text-xs font-bold mt-0.5">{variant.size || "-"}</div>
                          </td>
                          <td className="px-5 py-3.5 text-right font-medium text-[#706a61]">
                            {formatMoney(variant.costPricePaisa || 0)}
                          </td>
                          <td className="px-5 py-3.5 text-right font-medium text-[#706a61] line-through text-xs">
                            {variant.mrpPaisa ? formatMoney(variant.mrpPaisa) : "-"}
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold text-[#c9963e]">
                            {formatMoney(variant.sellingPricePaisa || 0)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="font-semibold text-[#1e8e3e]">{formatMoney(profitPaisa)}</div>
                            <div className="text-[10px] text-gray-500">{profitMargin}% margin</div>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className={`font-bold ${variant.stock <= variant.reorderLevel ? 'text-[#d93025]' : 'text-[#0b0b0b]'}`}>
                              {variant.stock}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${variant.status === 'ACTIVE' ? 'bg-[#e6f4ea] text-[#1e8e3e]' : 'bg-[#fce8e6] text-[#d93025]'}`}>
                              {variant.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="h-7 px-3 text-[10px]" onClick={() => startEditVariant(variant)}>Edit</Button>
                            <Button size="sm" variant="destructive" className="h-7 px-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100" onClick={() => handleDeleteVariant(variant._id)}>Delete</Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {(!product.variants || product.variants.length === 0) && (
                  <div className="text-center py-12 text-[#706a61]">
                    <PackageSearch className="mx-auto text-[#c2bcaf] mb-3" size={32} />
                    <p>No variants added yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Add Variant */}
            <div className="rounded-xl border bg-[#faf9f6] p-6 shadow-sm border-dashed">
              <h3 className="mb-5 font-semibold flex items-center gap-2"><Plus size={16} className="text-[#c9963e]"/> Add New Variant</h3>
              <form onSubmit={handleAddVariant} className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 items-end">
                <div className="space-y-1.5 lg:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#81796d]">SKU</label>
                  <Input name="sku" required className="h-9 text-xs font-mono" placeholder="USP-BLK-M" />
                </div>
                <div className="space-y-1.5 lg:col-span-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#81796d]">Color</label>
                  <Input name="color" className="h-9 text-xs" placeholder="Black" />
                </div>
                <div className="space-y-1.5 lg:col-span-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#81796d]">Size</label>
                  <Input name="size" className="h-9 text-xs font-bold" placeholder="M" />
                </div>
                <div className="space-y-1.5 lg:col-span-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#81796d]">Cost</label>
                  <Input name="costPrice" type="number" step="0.01" className="h-9 text-xs" placeholder="0.00" />
                </div>
                <div className="space-y-1.5 lg:col-span-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#81796d]">Selling</label>
                  <Input name="sellingPrice" type="number" step="0.01" required className="h-9 text-xs border-[#c9963e]" placeholder="0.00" />
                </div>
                <div className="space-y-1.5 lg:col-span-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#81796d]">Op. Stock</label>
                  <Input name="stock" type="number" className="h-9 text-xs" placeholder="0" defaultValue="0" />
                </div>
                <div className="lg:col-span-1">
                  <Button variant="gold" type="submit" disabled={addingVariant} className="w-full h-9 text-xs">
                    {addingVariant ? "..." : "Add"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* Inventory KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#81796d]">Total Units on Hand</p>
                <p className="mt-2 text-2xl font-bold font-financial text-[#0b0b0b]">
                  {product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0}
                </p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#81796d]">Inventory Cost Value</p>
                <p className="mt-2 text-2xl font-bold font-financial text-[#1a3a7a]">
                  {formatMoney(product.variants?.reduce((sum, v) => sum + (v.stock || 0) * (v.costPricePaisa || 0), 0) || 0)}
                </p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#81796d]">Retail Sales Value</p>
                <p className="mt-2 text-2xl font-bold font-financial text-[#1a6b3a]">
                  {formatMoney(product.variants?.reduce((sum, v) => sum + (v.stock || 0) * (v.sellingPricePaisa || 0), 0) || 0)}
                </p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#81796d]">Low / Out of Stock</p>
                <p className="mt-2 text-2xl font-bold font-financial text-[#8a1a1a]">
                  {product.variants?.filter((v) => (v.stock || 0) <= (v.reorderLevel || 5)).length || 0}
                </p>
              </div>
            </div>

            {/* Inventory Variants Table */}
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="border-b px-6 py-4">
                <h3 className="font-semibold text-base text-[#0b0b0b]">Live Variant Inventory</h3>
                <p className="text-xs text-[#8a847a] mt-0.5">Live stock positions and valuation for each variant</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-wider text-[#81796d]">
                    <tr>
                      <th className="px-6 py-3 font-semibold">SKU / Barcode</th>
                      <th className="px-6 py-3 font-semibold">Variant</th>
                      <th className="px-6 py-3 font-semibold text-right">Cost Value</th>
                      <th className="px-6 py-3 font-semibold text-right">Retail Value</th>
                      <th className="px-6 py-3 font-semibold text-right">Stock</th>
                      <th className="px-6 py-3 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ede7]">
                    {(product.variants || []).map((v) => {
                      const stock = v.stock || 0;
                      const isOut = stock === 0;
                      const isLow = stock > 0 && stock <= (v.reorderLevel || 5);
                      const costVal = stock * (v.costPricePaisa || 0);
                      const retailVal = stock * (v.sellingPricePaisa || 0);

                      return (
                        <tr key={v._id} className="hover:bg-[#faf9f6]">
                          <td className="px-6 py-3.5">
                            <span className="font-mono text-xs font-semibold">{v.sku}</span>
                            {v.barcode && <p className="font-mono text-[10px] text-[#8a847a]">{v.barcode}</p>}
                          </td>
                          <td className="px-6 py-3.5 text-xs text-[#5f584e]">
                            {[v.color, v.size].filter(Boolean).join(" · ") || "Default"}
                          </td>
                          <td className="px-6 py-3.5 text-right font-financial text-xs text-[#706a61]">
                            {formatMoney(costVal)}
                          </td>
                          <td className="px-6 py-3.5 text-right font-financial text-xs font-semibold text-[#0b0b0b]">
                            {formatMoney(retailVal)}
                          </td>
                          <td className="px-6 py-3.5 text-right font-bold font-financial">
                            {stock}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <span className={`inline-block rounded-sm px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                              isOut ? "bg-[#fef0f0] text-[#8a1a1a]" : isLow ? "bg-[#fdf8f0] text-[#8a5a10]" : "bg-[#f0f9f4] text-[#1a6b3a]"
                            }`}>
                              {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Inventory Movements Audit Log */}
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="border-b px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-base text-[#0b0b0b] flex items-center gap-2">
                    <History size={16} className="text-[#9b7740]" />
                    Inventory Audit Ledger
                  </h3>
                  <p className="text-xs text-[#8a847a] mt-0.5">Chronological movement history (sales, purchases, adjustments, returns)</p>
                </div>
                {movements.length > 0 && (
                  <span className="text-xs text-[#5f584e] bg-[#f5f2ee] px-2.5 py-1 rounded-full font-medium">
                    {movements.length} log entry{movements.length > 1 ? "ies" : "y"}
                  </span>
                )}
              </div>

              {loadingMovements ? (
                <div className="p-8 text-center text-xs text-[#706a61]">Loading movements log...</div>
              ) : movements.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8a847a]">
                  No movement logs recorded yet for this product.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-wider text-[#81796d] sticky top-0">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Date &amp; Time</th>
                        <th className="px-6 py-3 font-semibold">Type</th>
                        <th className="px-6 py-3 font-semibold">SKU / Variant</th>
                        <th className="px-6 py-3 font-semibold text-right">Change</th>
                        <th className="px-6 py-3 font-semibold">Reason</th>
                        <th className="px-6 py-3 font-semibold">Staff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0ede7]">
                      {movements.map((m) => {
                        const isPositive = m.quantityDelta > 0;
                        return (
                          <tr key={m._id} className="hover:bg-[#faf9f6]">
                            <td className="px-6 py-3 text-[#5f584e] whitespace-nowrap">
                              {new Date(m.occurredAt).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="px-6 py-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                m.type === "SALE" ? "bg-[#f0f4fc] text-[#1a3a7a]" :
                                m.type === "PURCHASE" ? "bg-[#f0f9f4] text-[#1a6b3a]" :
                                m.type === "RETURN" ? "bg-[#fdf8f0] text-[#8a5a10]" :
                                "bg-[#f5f2ee] text-[#5f584e]"
                              }`}>
                                {m.type}
                              </span>
                            </td>
                            <td className="px-6 py-3 font-mono text-[11px] font-medium text-[#0b0b0b]">
                              {m.skuSnapshot || "Variant"}
                            </td>
                            <td className={`px-6 py-3 text-right font-financial font-bold ${
                              isPositive ? "text-[#1a6b3a]" : "text-[#8a1a1a]"
                            }`}>
                              {isPositive ? `+${m.quantityDelta}` : m.quantityDelta}
                            </td>
                            <td className="px-6 py-3 text-[#5f584e] max-w-xs truncate" title={m.reason}>
                              {m.reason}
                            </td>
                            <td className="px-6 py-3 text-[#706a61]">
                              {m.performedBy?.name || "System"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SALES & MARGIN TAB */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            {/* Margin KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#81796d]">Average Unit Margin</p>
                <p className="mt-2 text-2xl font-bold font-financial text-[#1a6b3a]">
                  {(() => {
                    const vars = product.variants || [];
                    if (!vars.length) return "₹0.00";
                    const totalProfit = vars.reduce((s, v) => s + Math.max(0, (v.sellingPricePaisa || 0) - (v.costPricePaisa || 0)), 0);
                    return formatMoney(Math.round(totalProfit / vars.length));
                  })()}
                </p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#81796d]">Avg Gross Margin %</p>
                <p className="mt-2 text-2xl font-bold font-financial text-[#1a3a7a]">
                  {(() => {
                    const vars = product.variants || [];
                    if (!vars.length) return "0%";
                    const margins = vars.map(v => {
                      const sp = v.sellingPricePaisa || 0;
                      const cp = v.costPricePaisa || 0;
                      return sp > 0 ? ((sp - cp) / sp) * 100 : 0;
                    });
                    const avg = margins.reduce((a, b) => a + b, 0) / margins.length;
                    return `${avg.toFixed(1)}%`;
                  })()}
                </p>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#81796d]">Active Variants</p>
                <p className="mt-2 text-2xl font-bold font-financial text-[#0b0b0b]">
                  {product.variants?.filter(v => v.status === "ACTIVE").length || 0}
                </p>
              </div>
            </div>

            {/* Margin Breakdown Table */}
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="border-b px-6 py-4">
                <h3 className="font-semibold text-base text-[#0b0b0b]">Variant Margin & Profitability</h3>
                <p className="text-xs text-[#8a847a] mt-0.5">Unit profit margin and markup across each variant</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-wider text-[#81796d]">
                    <tr>
                      <th className="px-6 py-3 font-semibold">SKU</th>
                      <th className="px-6 py-3 font-semibold">Variant</th>
                      <th className="px-6 py-3 font-semibold text-right">Cost Price</th>
                      <th className="px-6 py-3 font-semibold text-right">MRP</th>
                      <th className="px-6 py-3 font-semibold text-right">Selling Price</th>
                      <th className="px-6 py-3 font-semibold text-right">Unit Profit</th>
                      <th className="px-6 py-3 font-semibold text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ede7]">
                    {(product.variants || []).map((v) => {
                      const cp = v.costPricePaisa || 0;
                      const mrp = v.mrpPaisa || 0;
                      const sp = v.sellingPricePaisa || 0;
                      const profit = sp - cp;
                      const marginPct = sp > 0 ? ((profit / sp) * 100).toFixed(1) : "0.0";

                      return (
                        <tr key={v._id} className="hover:bg-[#faf9f6]">
                          <td className="px-6 py-3.5 font-mono text-xs font-semibold">{v.sku}</td>
                          <td className="px-6 py-3.5 text-xs text-[#5f584e]">
                            {[v.color, v.size].filter(Boolean).join(" · ") || "Default"}
                          </td>
                          <td className="px-6 py-3.5 text-right font-financial text-xs text-[#706a61]">
                            {cp ? formatMoney(cp) : "—"}
                          </td>
                          <td className="px-6 py-3.5 text-right font-financial text-xs text-[#706a61]">
                            {mrp ? formatMoney(mrp) : "—"}
                          </td>
                          <td className="px-6 py-3.5 text-right font-financial text-xs font-semibold text-[#0b0b0b]">
                            {sp ? formatMoney(sp) : "—"}
                          </td>
                          <td className={`px-6 py-3.5 text-right font-financial text-xs font-semibold ${profit >= 0 ? "text-[#1a6b3a]" : "text-[#8a1a1a]"}`}>
                            {formatMoney(profit)}
                          </td>
                          <td className="px-6 py-3.5 text-right font-financial text-xs font-bold text-[#1a3a7a]">
                            {marginPct}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Historical Invoices For This Product */}
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="border-b px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-base text-[#0b0b0b] flex items-center gap-2">
                    <FileText size={16} className="text-[#1a6b3a]" />
                    Customer Sales Orders History
                  </h3>
                  <p className="text-xs text-[#8a847a] mt-0.5">Recent retail orders containing this product</p>
                </div>
                {salesHistory.length > 0 && (
                  <span className="text-xs text-[#5f584e] bg-[#f5f2ee] px-2.5 py-1 rounded-full font-medium">
                    {salesHistory.length} bill{salesHistory.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {loadingSales ? (
                <div className="p-8 text-center text-xs text-[#706a61]">Loading sales history...</div>
              ) : salesHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8a847a]">
                  No sales recorded yet for this product.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-wider text-[#81796d] sticky top-0">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Invoice No</th>
                        <th className="px-6 py-3 font-semibold">Date</th>
                        <th className="px-6 py-3 font-semibold">Customer</th>
                        <th className="px-6 py-3 font-semibold text-center">Units Sold</th>
                        <th className="px-6 py-3 font-semibold text-right">Revenue</th>
                        <th className="px-6 py-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0ede7]">
                      {salesHistory.map((s) => (
                        <tr key={s.orderId} className="hover:bg-[#faf9f6]">
                          <td className="px-6 py-3 font-mono font-bold text-[#0b0b0b]">
                            {s.invoiceNumber}
                          </td>
                          <td className="px-6 py-3 text-[#5f584e]">
                            {new Date(s.completedAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-6 py-3 text-[#0b0b0b] font-medium">
                            {s.customerName}
                            {s.customerMobile && (
                              <span className="text-[10px] text-[#8a847a] block">{s.customerMobile}</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-center font-bold text-[#0b0b0b]">
                            {s.totalUnits}
                          </td>
                          <td className="px-6 py-3 text-right font-financial font-bold text-[#1a6b3a]">
                            {formatMoney(s.totalRevenuePaisa)}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-[11px]"
                              onClick={() => setSelectedInvoiceId(s.orderId)}
                            >
                              View Bill
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      <BarcodePrintModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        variants={product.variants || []}
        productName={product.name}
      />

      {selectedInvoiceId && (
        <InvoiceModal
          isOpen={!!selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
          orderId={selectedInvoiceId}
        />
      )}
    </div>
  );
}
