import Link from "next/link";
import { FileText, MessageCircle } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/utils";
import { apiBase } from "@/lib/backend";
import DeleteOrderButton from "@/components/orders/DeleteOrderButton";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const res = await fetch(`${apiBase()}/orders`, { 
    cache: 'no-store',
  });
  
  const payload = await res.json().catch(() => ({}));
  const { orders = [], invoices = [], messages = [] } = payload.data || {};

  const invoiceByOrderId = new Map(invoices.map((invoice) => [invoice.orderId.toString(), invoice]));
  const messageByOrderId = new Map(messages.map((message) => [message.orderId.toString(), message]));

  return (
    <div className="overflow-hidden rounded-md border bg-white">
      <div className="flex items-end justify-between border-b px-5 py-5">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <span style={{ width: 16, height: 1, background: '#5a2a7a', display: 'inline-block' }} />
            Immutable sales ledger
          </p>
          <h2 className="page-headline" style={{ marginTop: 10, fontSize: 36 }}>
            Completed orders
          </h2>
          <p className="mt-1 text-sm text-[#756e64]" style={{ fontFamily: "'Inter', sans-serif" }}>Sales ledger with historical records.</p>
        </div>
        <span className="hidden rounded-full bg-[#f0ede7] px-3 py-1 text-xs font-semibold text-[#5f584e] sm:block">{orders.length} recent</span>
      </div>
      {orders.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.13em] text-[#81796d]">
              <tr>
                <th className="px-5 py-3 font-semibold">Invoice</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Items</th>
                <th className="px-5 py-3 font-semibold">Payment</th>
                <th className="px-5 py-3 font-semibold">WhatsApp</th>
                <th className="px-5 py-3 font-semibold">Completed</th>
                <th className="px-5 py-3 text-right font-semibold">Total</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const invoice = invoiceByOrderId.get(order._id.toString());
                const message = messageByOrderId.get(order._id.toString());
                return (
                  <tr key={order._id.toString()} className="border-t hover:bg-[#fffcf5]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-[#9b7740]" />
                        <a href={`${apiBase()}/invoices/${invoice?._id}/pdf`} target="_blank" rel="noreferrer" className="font-mono text-xs font-semibold hover:text-[#9b7740]">{order.invoiceNumber}</a>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {order.customerSnapshot?.name || "Walk-in"}
                      <p className="mt-1 text-xs text-[#7c756b]">{order.customerSnapshot?.mobile || "—"}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#5f594f]">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      {order.payments.map((payment) => payment.method).join(" + ")}
                    </td>
                    <td className="px-5 py-3.5">
                      {message ? (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${message.status === "FAILED" ? "text-[#9d382c]" : "text-[#617355]"}`}>
                          <MessageCircle size={14} />{message.status}
                        </span>
                      ) : (
                        <span className="text-xs text-[#898277]">Not requested</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#655e54]">
                      {formatDate(order.completedAt)}
                    </td>
                    <td className="font-financial px-5 py-3.5 text-right font-semibold">
                      {formatMoney(order.totalPaisa)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          href={`/billing?editOrderId=${order._id.toString()}`}
                          className="text-[#9b7740] hover:text-[#7a5c2f] transition-colors p-1"
                          title="Edit Order"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
                        </Link>
                        <DeleteOrderButton orderId={order._id.toString()} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid min-h-72 place-items-center p-6 text-center">
          <div>
            <FileText className="mx-auto text-[#c9963e]" size={28} />
            <p className="mt-3 text-sm font-medium">No completed orders yet</p>
            <Link href="/billing" className="mt-2 inline-block text-sm font-semibold text-[#805f2b]">Start a counter sale</Link>
          </div>
        </div>
      )}
    </div>
  );
}
