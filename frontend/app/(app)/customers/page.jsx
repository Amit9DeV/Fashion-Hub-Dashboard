import Link from "next/link";
import { UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import { can, getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const user = await getCurrentUser();
  if (!can(user, "customers:view")) redirect("/dashboard");
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/customers/all`, { 
    cache: 'no-store',
    headers: { 'Cookie': `fashion_hub_session=${user.token || ""}` }
  });
  
  const payload = await res.json().catch(() => ({}));
  const customers = payload.data?.customers || [];

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 border-b border-[#dfd8cc] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7740]">Clientele</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Customers</h2>
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
                    <td className="px-5 py-3.5 text-right font-semibold">
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
