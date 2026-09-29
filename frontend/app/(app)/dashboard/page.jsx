import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CircleAlert, Package, ReceiptText, UsersRound, FileText, TriangleAlert, Banknote, CreditCard, ScanLine, ClipboardList } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { serverFetch } from "@/lib/server-api";
import { SalesChart } from "@/components/dashboard/SalesChart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const res = await serverFetch("/dashboard/stats");
  if (res.status === 401) {
    redirect("/login");
  }
  const payload = await res.json().catch(() => ({}));
  const {
    today = { sales: 0, orders: 0, itemsSold: 0 },
    totalSales = 0,
    totalOrders = 0,
    newCustomers = 0,
    totalCustomers = 0,
    paymentSummary = { UPI: 0, CASH: 0, CARD: 0 },
    recentSales = [],
    inventoryAttention = { outOfStock: [], lowStock: [], outOfStockCount: 0, lowStockCount: 0 },
    salesChartData = [],
    topProducts = [],
  } = payload.data || {};

  const needsAttention = inventoryAttention.outOfStockCount > 0 || inventoryAttention.lowStockCount > 0;

  return (
    <div style={{ paddingBottom: 48 }} className="space-y-6 sm:space-y-8">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section style={{ borderBottom: '1px solid #e8e3da', paddingBottom: 24 }} className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <span style={{ width: 16, height: 1, background: '#c9963e', display: 'inline-block' }} />
            Today at Fashion Hub
          </p>
          <h2 className="page-headline" style={{ marginTop: 8, maxWidth: 540 }}>
            Make every counter moment count.
          </h2>
        </div>
        <Link
          href="/billing"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: '#0b0b0b', color: '#d8b46a',
            padding: '11px 22px', borderRadius: 3,
            fontSize: 13, fontWeight: 600, letterSpacing: '0.04em',
            fontFamily: "'Inter', sans-serif", textDecoration: 'none',
            border: '1px solid #2a2520', whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
          className="w-full sm:w-auto"
        >
          New sale <ArrowRight size={14} />
        </Link>
      </section>

      {/* ── KPI Row ───────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5 sm:gap-3">
        <MetricCard label="Total Sales" value={formatMoney(totalSales)} icon={ReceiptText} theme={{ bg: '#f0f9f4', text: '#1a6b3a', border: '#1a6b3a' }} />
        <MetricCard label="Today's Sales" value={formatMoney(today.sales)} icon={Banknote} theme={{ bg: '#f0f4fc', text: '#1a3a7a', border: '#1a3a7a' }} />
        <MetricCard label="Today's Orders" value={today.orders.toString()} icon={Package} theme={{ bg: '#fdf8f0', text: '#8a5a10', border: '#c9963e' }} />
        <MetricCard label="Total Orders" value={totalOrders.toLocaleString('en-IN')} icon={ClipboardList} theme={{ bg: '#f5f0fa', text: '#5a2a7a', border: '#5a2a7a' }} />
        <MetricCard label="Total Customers" value={totalCustomers.toString()} icon={UsersRound} theme={{ bg: '#f0f8f8', text: '#1a5a5a', border: '#1a5a5a' }} />
        <MetricCard
          label="Low Stock"
          value={inventoryAttention.lowStockCount.toString()}
          icon={CircleAlert}
          theme={{ bg: '#fdf8f0', text: '#8a5a10', border: '#8a5a10' }}
        />
        <MetricCard
          label="Out of Stock"
          value={inventoryAttention.outOfStockCount.toString()}
          icon={TriangleAlert}
          theme={{ bg: '#fef0f0', text: '#8a1a1a', border: '#8a1a1a' }}
        />
      </section>

      {/* ── Chart + Payment Summary ───────────────────────────────── */}
      <section className="grid gap-5 xl:grid-cols-[1.5fr_0.75fr]">
            {/* Sales Chart */}
            <div className="content-card">
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0ede7' }}>
                <p className="card-eyebrow" style={{ color: '#1a6b3a' }}>Sales Overview</p>
                <p className="card-title">30-Day Revenue Chart</p>
              </div>
              <div style={{ padding: '20px 20px 16px' }}>
                <SalesChart data={salesChartData} />
              </div>
            </div>

            {/* Payment Summary */}
            <div className="content-card flex flex-col">
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0ede7' }}>
                <p className="card-eyebrow" style={{ color: '#1a3a7a' }}>Payment Summary</p>
                <p className="card-title">Today's collection split</p>
              </div>
              <div style={{ padding: '20px 24px', flex: 1 }} className="space-y-5">
                <PaymentRow label="UPI" amount={paymentSummary.UPI || 0} icon={ScanLine} color="#1a3a7a" />
                <PaymentRow label="Cash" amount={paymentSummary.CASH || 0} icon={Banknote} color="#1a6b3a" />
                <PaymentRow label="Card" amount={paymentSummary.CARD || 0} icon={CreditCard} color="#5a2a7a" />
                {paymentSummary.OTHER > 0 && (
                  <PaymentRow label="Other" amount={paymentSummary.OTHER} icon={CreditCard} color="#706a61" />
                )}
                <div style={{ borderTop: '1px solid #f0ede7', paddingTop: 20, marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0b0b0b', letterSpacing: '0.02em', fontFamily: "'Inter', sans-serif" }}>Total</span>
                  <span className="font-financial" style={{ fontSize: 22, fontWeight: 700, color: '#1a6b3a', letterSpacing: '-0.02em' }}>{formatMoney(today.sales)}</span>
                </div>
              </div>
            </div>
      </section>

      {/* ── Recent Sales + Inventory Attention ───────────────────── */}
      <section className="grid gap-5 xl:grid-cols-[1.5fr_0.75fr]">
        {/* Recent Sales */}
        <div className="content-card">
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #f0ede7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="card-eyebrow" style={{ color: '#5a2a7a' }}>Recent Sales</p>
              <p className="card-title">Latest invoices</p>
            </div>
            <Link href="/orders" style={{ fontSize: 11, fontWeight: 600, color: '#7e5d27', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", textDecoration: 'none' }}>
              View all
            </Link>
          </div>
          {recentSales.length ? (
            <div className="overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#faf9f6' }}>
                    {["Invoice", "Customer", "Payment", "Amount"].map(h => (
                      <th key={h} className="px-3 py-2.5 sm:px-5 sm:py-3" style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#81796d', textAlign: h === 'Amount' ? 'right' : 'left', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentSales.slice(0, 6).map((order) => (
                    <tr key={order._id.toString()} style={{ borderTop: '1px solid #f5f2ee' }}>
                      <td className="px-3 py-2.5 sm:px-5 sm:py-3.5">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileText size={13} style={{ color: '#c9963e' }} />
                          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 600, color: '#0b0b0b', letterSpacing: '0.04em' }}>{order.invoiceNumber}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 sm:px-5 sm:py-3.5">
                        <p style={{ fontSize: 13, color: '#3d3830', fontWeight: 500 }}>{order.customerSnapshot?.name || "Walk-in"}</p>
                        {order.customerSnapshot?.mobile && (
                          <p style={{ fontSize: 10, color: '#81796d', marginTop: 2 }}>{order.customerSnapshot.mobile}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-xs text-[#81796d]">
                        {(order.payments || []).map(p => p.method).join(" + ") || "—"}
                      </td>
                      <td className="px-3 py-2.5 sm:px-5 sm:py-3.5 text-right text-xs sm:text-sm font-semibold text-[#1a6b3a] font-financial">{formatMoney(order.totalPaisa)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={ReceiptText} text="No sales recorded today." />
          )}
        </div>

        {/* Inventory Attention */}
        <div className="content-card flex flex-col">
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #f0ede7' }}>
            <p className="card-eyebrow" style={{ color: '#8a1a1a' }}>Inventory Attention</p>
            <p className="card-title">Action required</p>
          </div>
          {inventoryAttention.outOfStockCount > 0 || inventoryAttention.lowStockCount > 0 ? (
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 320, divideColor: '#f5f2ee' }}>
              {inventoryAttention.outOfStock.map((item) => (
                <div key={item.variant._id.toString()} style={{ padding: '14px 20px', borderBottom: '1px solid #f5f2ee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0b0b0b' }}>{item.name}</p>
                    <p style={{ fontSize: 10, color: '#81796d', marginTop: 2, letterSpacing: '0.04em' }}>{[item.variant.color, item.variant.size, item.variant.sku].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span style={{ background: '#fef0f0', color: '#8a1a1a', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }}>Out of stock</span>
                </div>
              ))}
              {inventoryAttention.lowStock.map((item) => (
                <div key={item.variant._id.toString()} style={{ padding: '14px 20px', borderBottom: '1px solid #f5f2ee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0b0b0b' }}>{item.name}</p>
                    <p style={{ fontSize: 10, color: '#81796d', marginTop: 2, letterSpacing: '0.04em' }}>{[item.variant.color, item.variant.size, item.variant.sku].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span style={{ background: '#fdf8f0', color: '#8a5a10', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }}>{item.variant.stock} left</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Package} text="All variants fully stocked." />
          )}
          {needsAttention && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f0ede7', background: '#fffaf5', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TriangleAlert size={13} style={{ color: '#c9963e', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#7a5c2f', fontFamily: "'Inter', sans-serif", letterSpacing: '0.02em' }}>
                {inventoryAttention.outOfStockCount > 0 && `${inventoryAttention.outOfStockCount} out of stock`}
                {inventoryAttention.outOfStockCount > 0 && inventoryAttention.lowStockCount > 0 && " · "}
                {inventoryAttention.lowStockCount > 0 && `${inventoryAttention.lowStockCount} running low`}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── Top Products ─────────────────────────────────────────── */}
      {topProducts.length > 0 && (
        <section className="content-card">
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #f0ede7' }}>
            <p className="card-eyebrow" style={{ color: '#1a5a5a' }}>Top Performers · Lifetime</p>
            <p className="card-title">Best-selling products</p>
          </div>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#faf9f6' }}>
                  {["Product", "Units Sold", "Revenue"].map((h, i) => (
                    <th key={h} style={{ padding: '10px 20px', fontSize: 9, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#81796d', textAlign: i === 2 ? 'right' : 'left', fontFamily: "'Inter', sans-serif" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, idx) => (
                  <tr key={idx} style={{ borderTop: '1px solid #f5f2ee' }}>
                    <td style={{ padding: '13px 20px', fontSize: 13, fontWeight: 600, color: '#0b0b0b' }}>{product.name}</td>
                    <td style={{ padding: '13px 20px', fontSize: 12, color: '#625d54', fontFamily: "'Inter', sans-serif" }}>{product.sold}</td>
                    <td style={{ padding: '13px 20px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#1a6b3a', fontVariantNumeric: 'tabular-nums', fontFamily: "'Inter', sans-serif" }}>{formatMoney(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function MetricCard({ label, value, icon: Icon, theme }) {
  const bg = theme ? theme.bg : '#ffffff';
  const color = theme ? theme.text : '#0b0b0b';
  const border = theme ? theme.border : 'transparent';
  return (
    <div className="metric-card" style={{ background: bg, borderLeft: `3px solid ${border}` }}>
      <Icon size={14} strokeWidth={1.6} className="metric-icon" style={{ color }} />
      <p className="metric-label" style={{ color }}>{label}</p>
      <p className="metric-value" style={{ color }}>{value}</p>
    </div>
  );
}

function PaymentRow({ label, amount, icon: Icon, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon size={14} strokeWidth={1.6} style={{ color: color || '#9c9489' }} />
        <span style={{ fontSize: 13, color: '#5f584e', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>{label}</span>
      </div>
      <span className="font-financial" style={{ fontSize: 14, fontWeight: 600, color: '#0b0b0b' }}>{formatMoney(amount)}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: 180, padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <Icon size={22} style={{ color: '#d8c9a8', margin: '0 auto' }} />
        <p style={{ marginTop: 12, fontSize: 12, color: '#9c9489', fontFamily: "'Inter', sans-serif", letterSpacing: '0.02em' }}>{text}</p>
      </div>
    </div>
  );
}
