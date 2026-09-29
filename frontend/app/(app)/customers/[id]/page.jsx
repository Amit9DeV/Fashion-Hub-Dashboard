import { formatMoney, formatDate } from "@/lib/utils";
import { apiBase } from "@/lib/backend";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import EditCustomerButton from "@/components/customers/EditCustomerButton";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage(props) {
  const params = await props.params;
  const cookieStore = await cookies();
  const res = await fetch(`${apiBase()}/customers/${params.id}`, {
    cache: 'no-store',
    headers: { cookie: cookieStore.toString() },
  });
  
  const payload = await res.json().catch(() => ({}));
  if (!payload.success || !payload.data?.customer) redirect("/customers");
  
  const { customer, orders = [] } = payload.data;

  return (
    <div className="space-y-7">
      <section className="border-b border-[#dfd8cc] pb-6 flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7740]">Customer Profile</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">{customer.name || "Unknown"}</h2>
          <div className="mt-2 text-sm text-[#706a61] space-x-4">
            {customer.mobile && <span>{customer.mobile}</span>}
            {customer.email && <span>{customer.email}</span>}
            {customer.gstin && <span>GSTIN: {customer.gstin}</span>}
          </div>
        </div>
        <EditCustomerButton customer={customer} />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#7b7367]">Total Orders</p>
          <p className="font-financial mt-4 text-2xl font-semibold">{customer.stats?.totalOrders || 0}</p>
        </div>
        <div className="rounded-md border bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#7b7367]">Total Spent</p>
          <p className="font-financial mt-4 text-2xl font-semibold">{formatMoney(customer.stats?.totalSpentPaisa || 0)}</p>
        </div>
        <div className="rounded-md border bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#7b7367]">Avg Order Value</p>
          <p className="font-financial mt-4 text-2xl font-semibold">
            {formatMoney(
              customer.stats?.averageOrderValuePaisa || 
              (customer.stats?.totalOrders ? Math.round(customer.stats.totalSpentPaisa / customer.stats.totalOrders) : 0)
            )}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-md border bg-white">
        <div className="border-b px-5 py-4">
          <h3 className="font-semibold">Order History</h3>
        </div>
        {orders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-[#81796d]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Invoice</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Items</th>
                  <th className="px-5 py-3 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id.toString()} className="border-t">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-[#9b7740]" />
                        <span className="font-mono text-xs font-semibold">{order.invoiceNumber}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">{formatDate(order.completedAt)}</td>
                    <td className="px-5 py-3.5">
                      {(order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold">{formatMoney(order.totalPaisa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-[#706a61]">No orders found for this customer.</div>
        )}
      </section>
    </div>
  );
}
