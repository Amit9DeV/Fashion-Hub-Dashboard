import Link from "next/link";
import { Plus, Shirt, Image as ImageIcon, Search } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { apiBase } from "@/lib/backend";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const res = await fetch(`${apiBase()}/products/all`, { 
    cache: 'no-store',
  });
  
  const payload = await res.json().catch(() => ({}));
  const products = payload.data?.products || [];

  return (
    <div className="space-y-7 pb-10">
      <section className="flex flex-col justify-between gap-4 border-b border-[#dfd8cc] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow flex items-center gap-2" style={{ color: '#8a5a10' }}>
            <span style={{ width: 16, height: 1, background: '#8a5a10', display: 'inline-block' }} />
            Product Catalog
          </p>
          <h2 className="page-headline" style={{ marginTop: 10, fontSize: 36 }}>
            Manage your items
          </h2>
        </div>
        <div className="flex gap-3">
          <Button variant="gold" asChild>
            <Link href="/products/new">
              Add Product <Plus size={17} className="ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Basic Filters Stub */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search products..." 
            className="w-full border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#9b7740]"
          />
        </div>
        <select className="border rounded-md px-3 py-2 text-sm text-[#706a61] focus:outline-none">
          <option>All Brands</option>
        </select>
        <select className="border rounded-md px-3 py-2 text-sm text-[#706a61] focus:outline-none">
          <option>All Categories</option>
        </select>
      </div>

      <section className="overflow-hidden rounded-md border bg-white shadow-sm">
        {products.length ? (
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

                  return (
                    <tr key={product._id.toString()} className="hover:bg-[#faf9f6] transition-colors">
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
                        <Link href={`/products/${product._id}`} className="font-semibold text-[#0b0b0b] hover:text-[#c9963e] transition-colors">
                          {product.name}
                        </Link>
                        {product.productCode && (
                          <p className="text-[10px] text-[#706a61] mt-0.5 tracking-wider">{product.productCode}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-[#5f584e]">{product.brandSnapshot || "-"}</p>
                        <p className="text-xs text-[#81796d] mt-0.5">{product.categorySnapshot || "-"}</p>
                      </td>
                      <td className="px-5 py-3.5 text-center font-medium">
                        {product.variantCount || 0}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <p className="font-medium">{product.totalStock || 0}</p>
                        <span className={`inline-block mt-1 rounded-sm px-1.5 py-0.5 text-[9px] font-bold tracking-widest ${stockStatusStyle}`}>
                          {stockLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${product.status === 'ACTIVE' ? 'bg-[#f0f9f4] text-[#1a6b3a]' : 'bg-[#fef0f0] text-[#8a1a1a]'}`}>
                          {product.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
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
        )}
      </section>
    </div>
  );
}
