import Link from "next/link";
import { ArrowUpRight, CircleAlert, Package, ReceiptText, UsersRound, FileText, TriangleAlert, Banknote, CreditCard, ScanLine } from "lucide-react";
import { redirect } from "next/navigation";
import { can, getCurrentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SalesChart } from "@/components/dashboard/SalesChart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!can(user, "dashboard:view")) redirect("/billing");
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/dashboard/stats`, { 
    cache: 'no-store',
    headers: { 'Cookie': `fashion_hub_session=${user.token || ""}` }
  });
  
  const payload = await res.json().catch(() => ({}));
  const { 
    today = { sales: 0, orders: 0, itemsSold: 0 }, 
    newCustomers = 0,
    paymentSummary = { UPI: 0, CASH: 0, CARD: 0 },
    recentSales = [],
    inventoryAttention = { outOfStock: [], lowStock: [], outOfStockCount: 0, lowStockCount: 0 },
    salesChartData = [],
    topProducts = []
  } = payload.data || {};

  const avgBill = today.orders > 0 ? Math.round(today.sales / today.orders) : 0;
  
  const needsAttention = inventoryAttention.outOfStockCount > 0 || inventoryAttention.lowStockCount > 0;

  return (
    <div className="space-y-7 pb-10">
      <section className="flex flex-col justify-between gap-4 border-b border-[#dfd8cc] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7740]">Today at Fashion Hub</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Make every counter moment count.</h2>
        </div>
        <Button variant="gold" asChild>
          <Link href="/billing">New sale <ArrowUpRight size={17} className="ml-2" /></Link>
        </Button>
      </section>

      {/* 6-item Metrics Row */}
      <section className="grid gap-4 grid-cols-2 lg:grid-cols-6">
        <MetricCard label="Sales" value={formatMoney(today.sales)} icon={ReceiptText} />
        <MetricCard label="Orders" value={today.orders.toString()} icon={Package} />
        <MetricCard label="Avg Bill" value={formatMoney(avgBill)} icon={ArrowUpRight} />
        <MetricCard label="Items Sold" value={today.itemsSold.toString()} icon={ScanLine} />
        <MetricCard label="New Customers" value={newCustomers.toString()} icon={UsersRound} />
        <MetricCard label="Low Stock" value={inventoryAttention.lowStockCount.toString()} icon={CircleAlert} alert={inventoryAttention.lowStockCount > 0} />
      </section>

      {/* Chart and Payments Row */}
      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
        <div className="rounded-md border bg-white">
          <div className="border-b px-5 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9b7740]">Sales Overview</h3>
            <p className="mt-1 font-semibold text-sm">30-Day Revenue Chart</p>
          </div>
          <div className="p-5">
            <SalesChart data={salesChartData} />
          </div>
        </div>

        <div className="rounded-md border bg-white flex flex-col">
          <div className="border-b px-5 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9b7740]">Payment Summary</h3>
            <p className="mt-1 font-semibold text-sm">Today's collection split</p>
          </div>
          <div className="flex-1 p-5 space-y-4">
            <PaymentRow label="UPI" amount={paymentSummary.UPI} icon={ScanLine} />
            <PaymentRow label="Cash" amount={paymentSummary.CASH} icon={Banknote} />
            <PaymentRow label="Card" amount={paymentSummary.CARD} icon={CreditCard} />
            <div className="pt-4 border-t mt-auto flex justify-between items-center font-semibold text-lg">
              <span>Total</span>
              <span className="font-financial">{formatMoney(today.sales)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Sales and Inventory Attention Row */}
      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
        <div className="overflow-hidden rounded-md border bg-white">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9b7740]">Recent Sales</p>
              <h3 className="mt-1 font-semibold text-sm">Latest invoices</h3>
            </div>
            <Link href="/orders" className="text-xs font-semibold text-[#7e5d27] hover:text-[#0b0b0b]">View all</Link>
          </div>
          {recentSales.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-[#81796d]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Invoice</th>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Payment</th>
                    <th className="px-5 py-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.slice(0, 5).map((order) => (
                    <tr key={order._id.toString()} className="border-t">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-[#9b7740]" />
                          {order.invoiceNumber}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">{order.customerSnapshot?.name || "Walk-in"}</td>
                      <td className="px-5 py-3.5 text-xs text-[#625d54]">{order.payments.map((p) => p.method).join(" + ")}</td>
                      <td className="font-financial px-5 py-3.5 text-right font-semibold">{formatMoney(order.totalPaisa)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={ReceiptText} text="No recent sales." />
          )}
        </div>

        <div className="overflow-hidden rounded-md border bg-white flex flex-col">
          <div className="border-b px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9b7740]">Inventory Attention</p>
            <h3 className="mt-1 font-semibold text-sm">Action required</h3>
          </div>
          {inventoryAttention.outOfStockCount > 0 || inventoryAttention.lowStockCount > 0 ? (
            <div className="divide-y overflow-y-auto max-h-[300px]">
              {inventoryAttention.outOfStock.map((item) => (
                <div key={item.variant._id.toString()} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="mt-1 text-xs text-[#706a61]">{[item.variant.color, item.variant.size, item.variant.sku].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span className="rounded-sm bg-[#fce8e6] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#d93025]">Out of Stock</span>
                </div>
              ))}
              {inventoryAttention.lowStock.map((item) => (
                <div key={item.variant._id.toString()} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="mt-1 text-xs text-[#706a61]">{[item.variant.color, item.variant.size, item.variant.sku].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span className="rounded-sm bg-[#fff2e6] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8a531e]">{item.variant.stock} left</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={UsersRound} text="No variants need restocking." />
          )}
        </div>
      </section>

      {/* Top Selling Products Row */}
      <section className="overflow-hidden rounded-md border bg-white">
        <div className="border-b px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9b7740]">Top Performers (30 Days)</p>
          <h3 className="mt-1 font-semibold text-sm">Top Selling Products</h3>
        </div>
        {topProducts.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-[#81796d]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Units Sold</th>
                  <th className="px-5 py-3 text-right font-semibold">Revenue Generated</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-5 py-3.5 font-medium">{product.name}</td>
                    <td className="px-5 py-3.5 text-xs text-[#625d54]">{product.sold}</td>
                    <td className="font-financial px-5 py-3.5 text-right font-semibold text-[#0b0b0b]">{formatMoney(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Package} text="Not enough data to calculate top products yet." />
        )}
      </section>

      {/* Needs Attention Banner */}
      {needsAttention && (
        <section className="rounded-md border border-[#e0ae9f] bg-[#fff0ec] px-5 py-4 text-[#8a2f20] flex items-center gap-3">
          <TriangleAlert size={20} />
          <div className="text-sm font-medium">
            <strong>Needs Attention:</strong> 
            {inventoryAttention.outOfStockCount > 0 && ` ${inventoryAttention.outOfStockCount} item(s) out of stock. `}
            {inventoryAttention.lowStockCount > 0 && ` ${inventoryAttention.lowStockCount} item(s) running low. `}
          </div>
        </section>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, alert }) {
  return (
    <div className={`rounded-md border bg-white p-4 ${alert ? 'border-[#e0ae9f] bg-[#fff0ec]' : ''}`}>
      <div className="flex justify-between">
        <p className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${alert ? 'text-[#8a2f20]' : 'text-[#7b7367]'}`}>{label}</p>
        <Icon className={alert ? 'text-[#8a2f20]' : 'text-[#c9963e]'} size={16} />
      </div>
      <p className={`font-financial mt-4 text-xl font-semibold tracking-tight ${alert ? 'text-[#8a2f20]' : ''}`}>{value}</p>
    </div>
  );
}

function PaymentRow({ label, amount, icon: Icon }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 text-sm text-[#5f584e]">
        <Icon size={16} />
        <span className="font-medium">{label}</span>
      </div>
      <span className="font-financial font-semibold">{formatMoney(amount)}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="grid flex-1 min-h-[200px] place-items-center p-6 text-center">
      <div>
        <Icon className="mx-auto text-[#c9963e]" size={24} />
        <p className="mt-3 text-sm text-[#706a61]">{text}</p>
      </div>
    </div>
  );
}
