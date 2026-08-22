import { apiBase } from "@/lib/backend";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const res = await fetch(`${apiBase()}/inventory`, { 
    cache: 'no-store',
  });
  
  const payload = await res.json().catch(() => ({}));
  const variants = payload.data?.variants || [];

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 border-b border-[#dfd8cc] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow flex items-center gap-2" style={{ color: '#8a1a1a' }}>
            <span style={{ width: 16, height: 1, background: '#8a1a1a', display: 'inline-block' }} />
            Stock Control
          </p>
          <h2 className="page-headline" style={{ marginTop: 10, fontSize: 36 }}>
            Inventory
          </h2>
        </div>
      </section>

      <section className="overflow-hidden rounded-md border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-[#81796d]">
              <tr>
                <th className="px-5 py-3 font-semibold">SKU</th>
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-5 py-3 font-semibold">Variant</th>
                <th className="px-5 py-3 text-right font-semibold">Stock</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.sku} className="border-t hover:bg-[#faf9f6]">
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold">{v.sku}</td>
                  <td className="px-5 py-3.5 font-medium">{v.productName}</td>
                  <td className="px-5 py-3.5 text-xs text-[#625d54]">{[v.color, v.size].filter(Boolean).join(" · ")}</td>
                  <td className="px-5 py-3.5 text-right font-semibold">
                    <span className={v.stock <= (v.reorderLevel || 2) ? "text-[#8a1a1a]" : "text-[#1a6b3a]"}>{v.stock}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                     <span className="text-xs text-[#958a78]">Use billing for out, receiving Soon</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
