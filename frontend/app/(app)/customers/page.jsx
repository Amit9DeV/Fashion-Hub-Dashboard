import Link from "next/link";
import { UsersRound } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { apiBase } from "@/lib/backend";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const res = await fetch(`${apiBase()}/customers/all`, { 
    cache: 'no-store',
  });
  
  const payload = await res.json().catch(() => ({}));
  const customers = payload.data?.customers || [];

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 border-b border-[#dfd8cc] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow flex items-center gap-2" style={{ color: '#1a5a5a' }}>
            <span style={{ width: 16, height: 1, background: '#1a5a5a', display: 'inline-block' }} />
            Clientele
          </p>
          <h2 className="page-headline" style={{ marginTop: 10, fontSize: 36 }}>
            Customers
          </h2>
        </div>
      </section>

      <section className="overflow-hidden rounded-md border bg-white">
        {customers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-[#81796d]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Contact</th>
                  <th className="px-5 py-3 font-semibold text-right">Orders</th>
                  <th className="px-5 py-3 font-semibold text-right">Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer._id.toString()} className="border-t hover:bg-[#faf9f6]">
                    <td className="px-5 py-3.5 font-semibold">
                      <Link href={`/customers/${customer._id}`} className="text-[#c9963e] hover:underline">
                        {customer.name || "Unknown"}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      {customer.mobile && <div>{customer.mobile}</div>}
                      {customer.email && <div className="text-xs text-[#706a61]">{customer.email}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold">{customer.stats?.totalOrders || 0}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-[#1a6b3a] font-financial">
                      {formatMoney(customer.stats?.totalSpentPaisa || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-48 place-items-center p-6 text-center">
            <div>
              <UsersRound className="mx-auto text-[#c9963e]" size={24} />
              <p className="mt-3 text-sm text-[#706a61]">No customers found.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
