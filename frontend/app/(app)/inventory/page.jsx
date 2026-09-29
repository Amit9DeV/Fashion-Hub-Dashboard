import { apiBase } from "@/lib/backend";
import { cookies } from "next/headers";
import Link from "next/link";
import { SearchInput } from "@/components/ui/SearchInput";
import { Boxes, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InventoryPage(props) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q || "";
  const cookieStore = await cookies();
  const res = await fetch(
    `${apiBase()}/inventory${q ? `?query=${encodeURIComponent(q)}` : ""}`,
    { cache: "no-store", headers: { cookie: cookieStore.toString() } }
  );

  const payload = await res.json().catch(() => ({}));
  const variants = payload.data?.variants || [];

  // Summary stats
  const totalVariants = variants.length;
  const outOfStock = variants.filter((v) => v.stock === 0).length;
  const lowStock = variants.filter(
    (v) => v.stock > 0 && v.stock <= (v.reorderLevel || 5)
  ).length;
  const totalUnits = variants.reduce((s, v) => s + (v.stock || 0), 0);

  return (
    <div className="space-y-7 pb-10">
      {/* ── Header ── */}
      <section className="flex flex-col justify-between gap-4 border-b border-[#dfd8cc] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow flex items-center gap-2" style={{ color: "#8a1a1a" }}>
            <span style={{ width: 16, height: 1, background: "#8a1a1a", display: "inline-block" }} />
            Stock Control
          </p>
          <h2 className="page-headline" style={{ marginTop: 10, fontSize: 36 }}>
            Inventory
          </h2>
          <p className="mt-1 text-sm text-[#756e64]">
            Live stock levels for all active product variants.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput placeholder="Search by SKU, name, or colour..." />
          <Button variant="gold" asChild>
            <Link href="/products/new">
              <Plus size={16} className="mr-2" /> Add Product
            </Link>
          </Button>
        </div>
      </section>

      {/* ── KPI cards ── */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total Variants" value={totalVariants} color="#1a3a7a" />
        <KpiCard label="Total Units" value={totalUnits} color="#1a6b3a" />
        <KpiCard label="Low Stock (≤5)" value={lowStock} color="#8a5a10" />
        <KpiCard label="Out of Stock" value={outOfStock} color="#8a1a1a" />
      </section>

      {/* ── Table ── */}
      <section className="overflow-hidden rounded-md border bg-white shadow-sm">
        {variants.length === 0 ? (
          <div className="grid min-h-[300px] place-items-center p-6 text-center">
            <div>
              <Boxes className="mx-auto text-[#c9963e]" size={28} />
              <p className="mt-3 text-sm font-medium text-[#5f584e]">No variants found</p>
              <p className="mt-1 text-xs text-[#8a847a]">
                {q ? `No results for "${q}". Try a different search.` : "Add products to see inventory here."}
              </p>
              <Button variant="gold" asChild className="mt-4">
                <Link href="/products/new">Add First Product</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-[#81796d]">
                <tr>
                  <th className="px-5 py-3 font-semibold">SKU</th>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Variant</th>
                  <th className="px-5 py-3 font-semibold text-right">Cost</th>
                  <th className="px-5 py-3 font-semibold text-right">MRP</th>
                  <th className="px-5 py-3 font-semibold text-right">Selling</th>
                  <th className="px-5 py-3 text-right font-semibold">Stock</th>
                  <th className="px-5 py-3 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ede7]">
                {variants.map((v) => {
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
                    <tr key={v._id?.toString() || v.sku} className="hover:bg-[#faf9f6] transition-colors">
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
                        {[v.color, v.size].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs text-[#8a847a] font-financial">
                        {v.costPricePaisa ? formatMoney(v.costPricePaisa) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs text-[#8a847a] font-financial">
                        {v.mrpPaisa ? formatMoney(v.mrpPaisa) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs font-semibold font-financial text-[#0b0b0b]">
                        {v.sellingPricePaisa ? formatMoney(v.sellingPricePaisa) : "—"}
                      </td>
                      <td className={`px-5 py-3.5 text-right font-bold ${stockColor}`}>
                        {v.stock}
                        {isLow && v.reorderLevel && (
                          <span className="block text-[9px] font-normal text-[#8a5a10] opacity-70">
                            reorder at {v.reorderLevel}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span
                          className={`inline-flex rounded-sm px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-center text-[#9c9489]">
        Stock increases via <Link href="/products" className="underline hover:text-[#c9963e]">Purchase Receive</Link> on product page.
        Stock decreases automatically with each completed sale.
      </p>
    </div>
  );
}

function KpiCard({ label, value, color }) {
  return (
    <div
      className="rounded-md border bg-white p-4 shadow-sm"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold font-financial" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
