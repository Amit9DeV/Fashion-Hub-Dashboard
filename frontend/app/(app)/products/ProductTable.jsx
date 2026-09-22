"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { api } from "@/src/services/api";

export default function ProductTable({ initialProducts }) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts || []);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    setProducts(initialProducts || []);
  }, [initialProducts]);

  useEffect(() => {
    api.products.getMaster().then((res) => {
      setBrands(res.brands || []);
      setCategories(res.categories || []);
    }).catch(console.error);
  }, []);

  const handleRowClick = (id) => {
    router.push(`/products/${id}`);
  };

  const startEdit = (e, product) => {
    e.stopPropagation();
    setEditingId(product._id);
    setEditForm({
      brandId: product.brandId || "",
      categoryId: product.categoryId || "",
      status: product.status || "ACTIVE",
      stock: product.variants?.length === 1 ? product.variants[0].stock : product.totalStock
    });
  };

  const cancelEdit = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const saveEdit = async (e, product) => {
    e.stopPropagation();
    try {
      const updateData = {
        brandId: editForm.brandId,
        categoryId: editForm.categoryId,
        status: editForm.status
      };
      
      const res = await api.products.update(product._id, updateData);
      let updatedProduct = { ...product, ...res.product };

      if (product.variants?.length === 1 && String(editForm.stock) !== String(product.variants[0].stock)) {
        const variantUpdate = await api.products.updateVariant(
          product._id, 
          product.variants[0]._id, 
          { stock: editForm.stock }
        );
        updatedProduct.variants[0] = variantUpdate.variant;
        updatedProduct.totalStock = editForm.stock;
      }

      setProducts(prev => prev.map(p => p._id === product._id ? updatedProduct : p));
      setEditingId(null);
    } catch (err) {
      alert("Failed to update product: " + err.message);
    }
  };

  const handleKeyDown = (e, product) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit(e, product);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit(e);
    }
  };

  if (!products.length) {
    return (
      <div className="grid min-h-[300px] place-items-center p-6 text-center">
        <div>
          <div className="mx-auto size-14 rounded-full bg-[#faf9f6] flex items-center justify-center border border-[#dfd8cc] mb-4">
            <Shirt className="text-[#c9963e]" size={24} />
          </div>
          <h3 className="font-semibold text-lg">No products found</h3>
          <p className="mt-1 text-sm text-[#706a61] max-w-xs mx-auto">Start building your catalog to manage inventory, track variants, and process sales.</p>
          <Button variant="gold" asChild className="mt-6">
            <Link href="/products/new">Add First Product</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-[#81796d]">
          <tr>
            <th className="px-5 py-3 font-semibold w-12">Image</th>
            <th className="px-5 py-3 font-semibold">Product</th>
            <th className="px-5 py-3 font-semibold">Brand & Category</th>
            <th className="px-5 py-3 font-semibold text-center">Variants</th>
            <th className="px-5 py-3 font-semibold text-right">Total Stock</th>
            <th className="px-5 py-3 text-right font-semibold">Status</th>
            <th className="px-5 py-3 font-semibold w-24 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0ede7]">
          {products.map((product) => {
            let stockStatusStyle = 'bg-gray-100 text-gray-600';
            let stockLabel = 'OUT OF STOCK';
            
            if (product.totalStock > 10) {
              stockStatusStyle = 'bg-[#f0f9f4] text-[#1a6b3a]';
              stockLabel = 'IN STOCK';
            } else if (product.totalStock > 0) {
              stockStatusStyle = 'bg-[#fdf8f0] text-[#8a5a10]';
              stockLabel = 'LOW STOCK';
            } else {
              stockStatusStyle = 'bg-[#fef0f0] text-[#8a1a1a]';
            }

            const isEditing = editingId === product._id;

            return (
              <tr 
                key={product._id.toString()} 
                className={`transition-colors ${isEditing ? 'bg-[#fdfcfb]' : 'hover:bg-[#faf9f6] cursor-pointer'}`}
                onClick={!isEditing ? () => handleRowClick(product._id) : undefined}
              >
                <td className="px-5 py-3.5">
                  <div className="size-10 rounded bg-[#f5f4f0] flex items-center justify-center border">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="size-10 object-cover rounded" />
                    ) : (
                      <ImageIcon size={16} className="text-[#c2bcaf]" />
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="font-semibold text-[#0b0b0b] hover:text-[#c9963e] transition-colors">
                    {product.name}
                  </span>
                  {product.productCode && (
                    <p className="text-[10px] text-[#706a61] mt-0.5 tracking-wider">{product.productCode}</p>
                  )}
                </td>
                <td className="px-5 py-3.5" onClick={e => isEditing && e.stopPropagation()}>
                  {isEditing ? (
                    <div className="space-y-2">
                      <select 
                        className="w-full text-xs rounded border p-1"
                        value={editForm.brandId}
                        onChange={e => setEditForm({...editForm, brandId: e.target.value})}
                        onKeyDown={e => handleKeyDown(e, product)}
                      >
                        <option value="">No Brand</option>
                        {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                      </select>
                      <select 
                        className="w-full text-xs rounded border p-1"
                        value={editForm.categoryId}
                        onChange={e => setEditForm({...editForm, categoryId: e.target.value})}
                        onKeyDown={e => handleKeyDown(e, product)}
                      >
                        <option value="">No Category</option>
                        {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-[#5f584e]">{product.brandSnapshot || "-"}</p>
                      <p className="text-xs text-[#81796d] mt-0.5">{product.categorySnapshot || "-"}</p>
                    </>
                  )}
                </td>
                <td className="px-5 py-3.5 text-center font-medium">
                  {product.variantCount || 0}
                </td>
                <td className="px-5 py-3.5 text-right" onClick={e => isEditing && e.stopPropagation()}>
                  {isEditing ? (
                    product.variants?.length === 1 ? (
                      <input 
                        type="number" 
                        className="w-20 text-xs rounded border p-1 text-right"
                        value={editForm.stock}
                        onChange={e => setEditForm({...editForm, stock: e.target.value})}
                        onKeyDown={e => handleKeyDown(e, product)}
                      />
                    ) : (
                      <span className="text-[10px] text-gray-500 italic text-right block">Multiple<br/>Variants</span>
                    )
                  ) : (
                    <>
                      <p className="font-medium">{product.totalStock || 0}</p>
                      <span className={`inline-block mt-1 rounded-sm px-1.5 py-0.5 text-[9px] font-bold tracking-widest ${stockStatusStyle}`}>
                        {stockLabel}
                      </span>
                    </>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right" onClick={e => isEditing && e.stopPropagation()}>
                  {isEditing ? (
                    <select 
                      className="w-24 text-xs rounded border p-1 ml-auto"
                      value={editForm.status}
                      onChange={e => setEditForm({...editForm, status: e.target.value})}
                      onKeyDown={e => handleKeyDown(e, product)}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="DRAFT">DRAFT</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                  ) : (
                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${product.status === 'ACTIVE' ? 'bg-[#f0f9f4] text-[#1a6b3a]' : 'bg-[#fef0f0] text-[#8a1a1a]'}`}>
                      {product.status}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                  {isEditing ? (
                    <div className="flex flex-col gap-1.5 justify-end items-end">
                      <Button size="sm" variant="gold" className="h-6 px-3 text-[10px] w-16" onClick={e => saveEdit(e, product)}>Save</Button>
                      <Button size="sm" variant="outline" className="h-6 px-3 text-[10px] w-16" onClick={cancelEdit}>Cancel</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 px-3 text-[10px]" onClick={e => startEdit(e, product)}>Edit</Button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  );
}
