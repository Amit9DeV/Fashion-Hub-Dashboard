import { redirect } from "next/navigation";
import { getCurrentUser, can } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (!can(user, "inventory:view")) redirect("/dashboard");
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/inventory`, { 
    cache: 'no-store',
    headers: { 'Cookie': `fashion_hub_session=${user.token || ""}` }
  });
  
  const payload = await res.json().catch(() => ({}));
  const variants = payload.data?.variants || [];

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 border-b border-[#dfd8cc] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7740]">Stock Control</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Inventory</h2>
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
                    <span className={v.stock <= (v.reorderLevel || 2) ? "text-[#d93025]" : ""}>{v.stock}</span>
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
