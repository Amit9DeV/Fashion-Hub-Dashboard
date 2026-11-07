"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import { 
  Calendar, Download, TrendingUp, RefreshCcw, DollarSign, 
  ReceiptText, Package, AlertCircle, ShoppingBag, ArrowDownRight,
  Edit2, Save, X, Receipt
} from "lucide-react";
import { formatMoney, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/src/services/api";
import { toast } from "sonner";
import InvoiceModal from "@/components/invoice/InvoiceModal";

const PRESET_DATES = [
  { label: "Lifetime", value: "lifetime" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "7days" },
  { label: "Last 30 Days", value: "30days" },
  { label: "This Month", value: "thismonth" },
  { label: "Custom", value: "custom" },
];

function getDateRange(preset) {
  const end = new Date();
  const start = new Date();
  switch (preset) {
    case "lifetime":
      return { start: "", end: "" };
    case "today":
      break;
    case "yesterday":
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case "7days":
      start.setDate(start.getDate() - 6);
      break;
    case "30days":
      start.setDate(start.getDate() - 29);
      break;
    case "thismonth":
      start.setDate(1);
      break;
  }
  return { 
    start: start.toISOString().split("T")[0], 
    end: end.toISOString().split("T")[0] 
  };
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [preset, setPreset] = useState("lifetime");
  
  const defaultDates = getDateRange("lifetime");
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  
  const [productTab, setProductTab] = useState("units"); // 'units', 'profit', 'slow'
  const [expandedBillId, setExpandedBillId] = useState(null);
  const [viewingInvoiceId, setViewingInvoiceId] = useState(null);

  const fetchReport = async (start, end) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (start) query.append("startDate", start);
      if (end) query.append("endDate", end);
      
      const data = await api.reports.getSales(query.toString());
      setReport(data);
    } catch (err) {
      console.error("Error fetching report:", err);
      toast.error("Failed to fetch reports. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(startDate, endDate);
  }, []);

  const handlePresetChange = (e) => {
    const val = e.target.value;
    setPreset(val);
    if (val !== "custom") {
      const { start, end } = getDateRange(val);
      setStartDate(start);
      setEndDate(end);
      fetchReport(start, end);
    }
  };

  const handleCustomFilter = (e) => {
    e.preventDefault();
    setPreset("custom");
    fetchReport(startDate, endDate);
  };

  const handleExport = () => {
    if (!report) return;
    const lines = ["Bill Number,Date,Customer,Items,Sales,COGS,Gross Profit,Margin,Payment Method"];
    report.billWiseProfit.forEach(b => {
      lines.push(`${b.invoiceNumber},${new Date(b.completedAt).toLocaleDateString()},"${b.customer}",${b.itemsCount},${b.salesPaisa/100},${b.cogsPaisa/100},${b.profitPaisa/100},${b.marginPct.toFixed(2)}%,"${b.paymentMethods}"`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Store_Report_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sortedProducts = useMemo(() => {
    if (!report) return [];
    const prods = [...report.productPerformance];
    if (productTab === "units") return prods.sort((a, b) => b.units - a.units).slice(0, 50);
    if (productTab === "profit") return prods.sort((a, b) => b.profit - a.profit).slice(0, 50);
    if (productTab === "slow") return prods.sort((a, b) => a.units - b.units).slice(0, 50);
    return prods;
  }, [report, productTab]);

  const CustomTooltip = ({ active, payload, label, isMoney }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-md border bg-white p-3 shadow-lg z-50">
          <p className="mb-2 text-xs font-bold text-[#151515] uppercase">{label}</p>
          <div className="space-y-1">
            {payload.map((entry, index) => {
              const isItemCount = entry.dataKey === "items" || entry.name === "Items Sold";
              return (
                <div key={index} className="flex items-center justify-between gap-4 text-xs font-medium text-[#5f584e]">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    {entry.name}
                  </div>
                  <span className="font-semibold text-[#151515]">
                    {isItemCount
                      ? `${Number(entry.value).toLocaleString()} units`
                      : isMoney
                        ? formatMoney(entry.value)
                        : Number(entry.value).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading && !report) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-[#706a61]">
        <RefreshCcw size={32} className="animate-spin text-[#c9963e] mb-4" />
        <p className="text-sm font-medium">Aggregating store analytics...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-[#706a61] gap-4">
        <AlertCircle size={32} className="text-[#a53a2d]" />
        <div className="text-center">
          <p className="font-semibold text-[#0b0b0b]">Failed to load reports</p>
          <p className="text-sm mt-1">Please check your connection and try again.</p>
        </div>
        <button
          onClick={() => fetchReport(startDate, endDate)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#0b0b0b] text-white text-sm font-medium hover:bg-[#2a2520] transition-colors"
        >
          <RefreshCcw size={14} /> Retry
        </button>
      </div>
    );
  }

  const { kpis } = report;

  return (
    <div className="space-y-8 pb-10">
      
      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between border-b border-[#dfd8cc] pb-6 gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#1a6b3a] flex items-center gap-2">
            <span className="w-4 h-0.5 bg-[#1a6b3a]"></span> Analytics Dashboard
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-[#151515] mt-1">Store Reports</h2>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 bg-white p-2.5 rounded-md border border-[#e6e0d5] shadow-sm">
          <select 
            value={preset} 
            onChange={handlePresetChange}
            className="h-9 rounded border border-[#e6e0d5] bg-[#faf9f6] px-3 text-xs font-medium text-[#151515] outline-none focus:border-[#c9963e] w-full sm:w-auto"
          >
            {PRESET_DATES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          
          <form onSubmit={handleCustomFilter} className="flex items-center gap-2 flex-1 sm:flex-initial flex-wrap sm:flex-nowrap">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 sm:w-auto min-w-[125px] h-9 text-xs bg-[#faf9f6]" required />
            <span className="text-[#8a847a] text-xs">to</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 sm:w-auto min-w-[125px] h-9 text-xs bg-[#faf9f6]" required />
            <Button type="submit" variant="outline" size="sm" className="h-9 px-3 bg-[#faf9f6]">
              <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
            </Button>
          </form>
          
          <div className="hidden sm:block w-px h-6 bg-[#dfd8cc] mx-1"></div>
          
          <Button onClick={handleExport} className="w-full sm:w-auto h-9 bg-[#1a6b3a] text-white hover:bg-[#134d2a] transition-colors shadow-sm justify-center">
            <Download size={14} className="mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* ── KPI CARDS ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* ROW 1 */}
        <KpiCard title="Net Sales" value={formatMoney(kpis.totalSales)} icon={TrendingUp} color="#1a6b3a" />
        <KpiCard title="Gross Profit" value={formatMoney(kpis.grossProfit)} icon={DollarSign} color="#1a6b3a" />
        <KpiCard title="Total Bills" value={kpis.totalBills.toLocaleString()} icon={ReceiptText} color="#0b0b0b" />
        <KpiCard title="Items Sold" value={kpis.itemsSold.toLocaleString()} icon={Package} color="#0b0b0b" />
        
        {/* ROW 2 */}
        <KpiCard title="Profit Margin" value={`${kpis.profitMargin.toFixed(1)}%`} icon={TrendingUp} color={kpis.profitMargin < 0 ? "#a53a2d" : "#c9963e"} />
        <KpiCard title="Average Bill" value={formatMoney(kpis.avgBillValue)} icon={ReceiptText} color="#c9963e" />
        <KpiCard title="Total Discounts" value={formatMoney(kpis.totalDiscounts)} icon={AlertCircle} color="#5a2a7a" />
        <KpiCard title="Total Refunds" value={formatMoney(kpis.totalReturns)} icon={ArrowDownRight} color="#a53a2d" />
      </div>

      {/* ── CHARTS: SALES TREND & PAYMENTS ─────────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border border-[#e6e0d5] bg-white shadow-sm flex flex-col">
          <div className="border-b border-[#f0ede7] px-6 py-5">
            <h3 className="font-bold text-[#151515]">Sales & Profit Trend</h3>
            <p className="text-xs text-[#8a847a] mt-1">Daily performance over selected period</p>
          </div>
          <div className="flex-1 p-6 min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f2ee" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8a847a" }} dy={10} tickFormatter={(v) => v.slice(5)} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8a847a" }} tickFormatter={(v) => `₹${v/100}`} dx={-10} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8a847a" }} dx={10} />
                <Tooltip content={<CustomTooltip isMoney={true} />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Line yAxisId="left" type="monotone" dataKey="sales" name="Sales (₹)" stroke="#1a3a7a" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                <Line yAxisId="left" type="monotone" dataKey="profit" name="Profit (₹)" stroke="#1a6b3a" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="items" name="Items Sold" stroke="#c9963e" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-[#e6e0d5] bg-white shadow-sm flex flex-col">
          <div className="border-b border-[#f0ede7] px-6 py-5">
            <h3 className="font-bold text-[#151515]">Payment Methods</h3>
            <p className="text-xs text-[#8a847a] mt-1">Revenue split by transaction type</p>
          </div>
          <div className="flex-1 p-6 min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={report.paymentMethods}
                  cx="50%" cy="45%"
                  innerRadius={70} outerRadius={110}
                  paddingAngle={2}
                  dataKey="amountPaisa" nameKey="method"
                  stroke="none"
                >
                  {report.paymentMethods.map((entry, index) => {
                    const colors = ["#1a6b3a", "#c9963e", "#5a2a7a", "#1a3a7a", "#0b0b0b"];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Pie>
                <Tooltip content={<CustomTooltip isMoney={true} />} />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── BILL-WISE PROFIT TABLE ─────────────────────────────────────── */}
      <section className="rounded-lg border border-[#e6e0d5] bg-white shadow-sm">
        <div className="border-b border-[#f0ede7] px-6 py-5 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#151515]">Bill-wise Profit Report</h3>
            <p className="text-xs text-[#8a847a] mt-1">Detailed breakdown of margins per transaction (Top 500)</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#faf9f6] text-xs uppercase tracking-wider text-[#8a847a]">
              <tr>
                <th className="px-6 py-4 font-semibold">Bill No.</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold text-center">Items</th>
                <th className="px-6 py-4 font-semibold text-right">Sales</th>
                <th className="px-6 py-4 font-semibold text-right">COGS</th>
                <th className="px-6 py-4 font-semibold text-right">Profit</th>
                <th className="px-6 py-4 font-semibold text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ede7]">
              {report.billWiseProfit.map((bill) => {
                const isLoss = bill.marginPct < 0;
                return (
                  <React.Fragment key={bill.id}>
                    <tr 
                      onClick={() => setExpandedBillId(expandedBillId === bill.id ? null : bill.id)}
                      className={`cursor-pointer transition-colors ${expandedBillId === bill.id ? 'bg-[#fffcf5]' : 'hover:bg-[#faf9f6]'}`}
                    >
                      <td className="px-6 py-4 font-mono font-semibold text-[#1a3a7a]">{bill.invoiceNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#5f584e]">{formatDate(bill.completedAt)}</td>
                      <td className="px-6 py-4 font-medium">{bill.customer}</td>
                      <td className="px-6 py-4 text-center">{bill.itemsCount}</td>
                      <td className="px-6 py-4 text-right font-financial">{formatMoney(bill.salesPaisa)}</td>
                      <td className="px-6 py-4 text-right font-financial text-[#777169]">{formatMoney(bill.cogsPaisa)}</td>
                      <td className={`px-6 py-4 text-right font-financial font-bold ${isLoss ? 'text-[#a53a2d]' : 'text-[#1a6b3a]'}`}>
                        {formatMoney(bill.profitPaisa)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${isLoss ? 'bg-[#fef0f0] text-[#a53a2d]' : 'bg-[#eef6ea] text-[#1a6b3a]'}`}>
                          {bill.marginPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                    {expandedBillId === bill.id && (
                      <tr className="bg-[#fffaf5]">
                        <td colSpan="8" className="px-8 py-5 border-t border-[#f0ede7]">
                          <ExpandedBillDetails 
                            bill={bill} 
                            onUpdated={() => fetchReport(startDate, endDate)} 
                            onViewInvoice={() => setViewingInvoiceId(bill.id)}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {report.billWiseProfit.length === 0 && (
                <tr><td colSpan="8" className="px-6 py-8 text-center text-[#8a847a]">No sales recorded in this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── PRODUCT PERFORMANCE ────────────────────────────────────────── */}
      <section className="rounded-lg border border-[#e6e0d5] bg-white shadow-sm">
        <div className="border-b border-[#f0ede7] px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-[#151515]">Product Performance</h3>
            <p className="text-xs text-[#8a847a] mt-1">Identify which items drive your business</p>
          </div>
          <div className="flex flex-wrap bg-[#faf9f6] p-1 rounded-md border border-[#e6e0d5] w-full sm:w-auto">
            <button 
              onClick={() => setProductTab("units")} 
              className={`flex-1 sm:flex-initial text-center px-3 py-1.5 text-xs font-semibold rounded ${productTab === 'units' ? 'bg-white shadow-sm text-[#151515]' : 'text-[#8a847a]'}`}
            >
              Best Sellers
            </button>
            <button 
              onClick={() => setProductTab("profit")} 
              className={`flex-1 sm:flex-initial text-center px-3 py-1.5 text-xs font-semibold rounded ${productTab === 'profit' ? 'bg-white shadow-sm text-[#1a6b3a]' : 'text-[#8a847a]'}`}
            >
              Most Profitable
            </button>
            <button 
              onClick={() => setProductTab("slow")} 
              className={`flex-1 sm:flex-initial text-center px-3 py-1.5 text-xs font-semibold rounded ${productTab === 'slow' ? 'bg-white shadow-sm text-[#a53a2d]' : 'text-[#8a847a]'}`}
            >
              Slow Sellers
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#faf9f6] text-xs uppercase tracking-wider text-[#8a847a]">
              <tr>
                <th className="px-6 py-4 font-semibold">Product</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold text-center">Units Sold</th>
                <th className="px-6 py-4 font-semibold text-right">Sales</th>
                <th className="px-6 py-4 font-semibold text-right">COGS</th>
                <th className="px-6 py-4 font-semibold text-right">Profit</th>
                <th className="px-6 py-4 font-semibold text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ede7]">
              {sortedProducts.map((p, idx) => (
                <tr key={idx} className="hover:bg-[#faf9f6]">
                  <td className="px-6 py-4 font-medium text-[#151515]">{p.name} <span className="text-[10px] text-[#8a847a] block mt-0.5">{p.sku}</span></td>
                  <td className="px-6 py-4 text-[#5f584e]">{p.category}</td>
                  <td className="px-6 py-4 text-center font-semibold">{p.units}</td>
                  <td className="px-6 py-4 text-right font-financial">{formatMoney(p.sales)}</td>
                  <td className="px-6 py-4 text-right font-financial text-[#777169]">{formatMoney(p.cogs)}</td>
                  <td className={`px-6 py-4 text-right font-financial font-bold ${p.profit < 0 ? 'text-[#a53a2d]' : 'text-[#1a6b3a]'}`}>{formatMoney(p.profit)}</td>
                  <td className="px-6 py-4 text-right text-xs font-semibold">{p.margin.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── ATTRIBUTE PERFORMANCE ──────────────────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Category */}
        <div className="rounded-lg border border-[#e6e0d5] bg-white shadow-sm flex flex-col">
          <div className="border-b border-[#f0ede7] px-5 py-4">
            <h3 className="font-bold text-[#151515]">Categories</h3>
          </div>
          <div className="flex-1 overflow-auto max-h-[350px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf9f6] text-[#8a847a] uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold text-center">Units</th>
                  <th className="px-4 py-3 font-semibold text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f2ee]">
                {report.categoryPerformance.map((c, i) => (
                  <tr key={i} className="hover:bg-[#faf9f6]">
                    <td className="px-4 py-3 font-medium text-[#151515]">{c.category}</td>
                    <td className="px-4 py-3 text-center">{c.units}</td>
                    <td className="px-4 py-3 text-right font-financial text-[#1a6b3a]">{formatMoney(c.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sizes */}
        <div className="rounded-lg border border-[#e6e0d5] bg-white shadow-sm flex flex-col">
          <div className="border-b border-[#f0ede7] px-5 py-4">
            <h3 className="font-bold text-[#151515]">Size Analytics</h3>
          </div>
          <div className="flex-1 overflow-auto max-h-[350px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf9f6] text-[#8a847a] uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-semibold">Size</th>
                  <th className="px-4 py-3 font-semibold text-center">Units</th>
                  <th className="px-4 py-3 font-semibold text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f2ee]">
                {report.sizePerformance.map((s, i) => (
                  <tr key={i} className="hover:bg-[#faf9f6]">
                    <td className="px-4 py-3 font-medium text-[#151515]">{s.size}</td>
                    <td className="px-4 py-3 text-center">{s.units}</td>
                    <td className="px-4 py-3 text-right font-financial text-[#1a6b3a]">{formatMoney(s.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Colors */}
        <div className="rounded-lg border border-[#e6e0d5] bg-white shadow-sm flex flex-col">
          <div className="border-b border-[#f0ede7] px-5 py-4">
            <h3 className="font-bold text-[#151515]">Color Analytics</h3>
          </div>
          <div className="flex-1 overflow-auto max-h-[350px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf9f6] text-[#8a847a] uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-semibold">Color</th>
                  <th className="px-4 py-3 font-semibold text-center">Units</th>
                  <th className="px-4 py-3 font-semibold text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f2ee]">
                {report.colorPerformance.map((c, i) => (
                  <tr key={i} className="hover:bg-[#faf9f6]">
                    <td className="px-4 py-3 font-medium text-[#151515]">{c.color}</td>
                    <td className="px-4 py-3 text-center">{c.units}</td>
                    <td className="px-4 py-3 text-right font-financial text-[#1a6b3a]">{formatMoney(c.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <InvoiceModal
        isOpen={!!viewingInvoiceId}
        onClose={() => setViewingInvoiceId(null)}
        invoiceId={viewingInvoiceId}
        orderId={viewingInvoiceId}
      />
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, color }) {
  return (
    <div className="rounded-lg border border-[#e6e0d5] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[#8a847a]">{title}</p>
        <div className="p-2 rounded-md bg-[#faf9f6] border border-[#f0ede7]">
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <p className="font-financial text-2xl font-bold tracking-tight text-[#151515]">{value}</p>
    </div>
  );
}

function ExpandedBillDetails({ bill, onUpdated, onViewInvoice }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);

  // Compute a reliable unit selling price from available data
  function getUnitSellingPrice(item) {
    // sellingPricePaisa comes from "$items.unitPricePaisa" in aggregation
    if (item.sellingPricePaisa && item.sellingPricePaisa > 0) return item.sellingPricePaisa;
    // fallback: derive from totalItemSalesPaisa / quantity
    if (item.totalItemSalesPaisa > 0 && item.quantity > 0) {
      return Math.round(item.totalItemSalesPaisa / item.quantity);
    }
    return 0;
  }

  // Compute a reliable unit cost price from available data
  function getUnitCostPrice(item) {
    if (item.costPricePaisa && item.costPricePaisa > 0) return item.costPricePaisa;
    if (item.unitCostPaisa && item.unitCostPaisa > 0) return item.unitCostPaisa;
    if (item.totalItemCostPaisa > 0 && item.quantity > 0) {
      return Math.round(item.totalItemCostPaisa / item.quantity);
    }
    return 0;
  }

  useEffect(() => {
    setItems(bill.items.map(i => ({
      ...i,
      _unitCostPaisa: getUnitCostPrice(i),
      _unitSellingPaisa: getUnitSellingPrice(i),
    })));
  }, [bill, isEditing]);

  const handleCostChange = (idx, val) => {
    const newItems = [...items];
    const numVal = Math.round(Number(val) * 100);
    newItems[idx]._unitCostPaisa = isNaN(numVal) || numVal < 0 ? 0 : numVal;
    setItems(newItems);
  };

  // COGS correction only — does NOT change selling prices, items, payments, customer
  const handleSaveCostCorrection = async () => {
    try {
      setSaving(true);
      const fullOrderResponse = await api.orders.getById(bill.id);
      const fullOrder = fullOrderResponse.order;

      // Build payload preserving everything except cost overrides
      const payload = {
        items: items.map(i => ({
          productId: i.productId?.toString(),
          variantId: i.variantId?.toString(),
          quantity: i.quantity,
          overriddenPricePaisa: i._unitSellingPaisa,
          overriddenCostPaisa: i._unitCostPaisa,
          overriddenName: i.productName,
        })),
        customer: fullOrder.customerId
          ? { customerId: fullOrder.customerId.toString() }
          : (fullOrder.customerSnapshot?.name || fullOrder.customerSnapshot?.mobile)
            ? {
                name: fullOrder.customerSnapshot?.name,
                mobile: fullOrder.customerSnapshot?.mobile,
                whatsappNumber: fullOrder.customerSnapshot?.whatsappNumber,
              }
            : null,
        discountPaisa: fullOrder.discountPaisa || 0,
        payments: (fullOrder.payments || []).map(p => ({
          method: p.method,
          amountPaisa: p.amountPaisa,
        })),
        notes: fullOrder.notes,
        idempotencyKey: `costedit-${bill.id}-${Date.now()}`,
        completedAt: fullOrder.completedAt,
      };

      await api.orders.update(bill.id, payload);
      setIsEditing(false);
      toast.success("Cost data updated successfully");
      onUpdated();
    } catch (e) {
      toast.error("Failed to update cost data: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded border border-[#dfd8cc] bg-white overflow-hidden">
      <div className="bg-[#f5f2ee] px-4 py-2.5 flex flex-wrap justify-between items-center gap-2 border-b border-[#dfd8cc]">
        <h4 className="font-bold text-xs text-[#5f584e] uppercase tracking-wider">Bill Items</h4>
        <div className="flex flex-wrap gap-2 items-center">
          {onViewInvoice && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onViewInvoice}
              className="h-7 px-2.5 text-xs text-[#9b7740] border-[#c9963e] hover:bg-[#fff9ed] font-medium flex items-center gap-1"
              title="View and print luxury invoice"
            >
              <Receipt size={12} /> View Invoice
            </Button>
          )}

          {/* Full edit → opens BillingPOS edit mode */}
          <a
            href={`/billing?editOrderId=${bill.id}`}
            className="h-7 px-3 text-xs font-medium inline-flex items-center gap-1 rounded border border-[#c9963e] text-[#9b7740] hover:bg-[#fffcf5] transition-colors"
            title="Edit items, customer, payment, discount in the full POS interface"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
            Full Edit (POS)
          </a>

          {/* Inline cost correction */}
          {!isEditing ? (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-7 px-2 text-xs text-[#5a2a7a] hover:bg-[#f0e8ff]">
              <Edit2 size={12} className="mr-1" /> Fix Cost Prices
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={saving} className="h-7 px-2 text-xs text-[#a53a2d] hover:bg-[#ffe6e6]">
                <X size={12} className="mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSaveCostCorrection} disabled={saving} className="h-7 px-2 text-xs bg-[#5a2a7a] hover:bg-[#3d1a57] text-white">
                {saving ? <RefreshCcw size={12} className="animate-spin mr-1" /> : <Save size={12} className="mr-1" />} Save Costs
              </Button>
            </div>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="px-4 py-2 bg-[#f8f4ff] border-b border-[#dfd8cc]">
          <p className="text-[10px] text-[#5a2a7a] font-medium">
            ✏ <strong>Cost Price Correction</strong> — Adjusts COGS &amp; profit margin only. To change items, quantities, payment or customer, use <strong>Full Edit (POS)</strong> above.
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left sub-table">
          <thead className="bg-[#faf9f6] text-[#8a847a]">
            <tr>
              <th className="px-4 py-2 font-semibold">Item</th>
              <th className="px-4 py-2 font-semibold text-center w-16">Qty</th>
              <th className="px-4 py-2 font-semibold text-right w-28">
                {isEditing ? "Cost Price (edit)" : "Cost Price"}
              </th>
              <th className="px-4 py-2 font-semibold text-right w-28">Selling Price</th>
              <th className="px-4 py-2 font-semibold text-right">Item Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f5f2ee]">
            {(isEditing ? items : bill.items).map((item, idx) => {
              const unitCost = isEditing
                ? item._unitCostPaisa
                : getUnitCostPrice(item);
              const unitSelling = isEditing
                ? item._unitSellingPaisa
                : getUnitSellingPrice(item);
              const qty = item.quantity;
              const itemProfit = (unitSelling - unitCost) * qty;

              return (
                <tr key={idx} className={isEditing ? "bg-[#fdf8ff]" : ""}>
                  <td className="px-4 py-2 font-medium">
                    {item.productName} <span className="text-[#8a847a]">({item.sku})</span>
                  </td>
                  <td className="px-4 py-2 text-center">{qty}</td>
                  <td className="px-4 py-2 text-right font-financial text-[#777169]">
                    {isEditing ? (
                      <div className="flex items-center justify-end">
                        <span className="mr-1 text-[#8a847a]">₹</span>
                        <Input
                          type="number" step="0.01" min="0"
                          value={unitCost / 100}
                          onChange={e => handleCostChange(idx, e.target.value)}
                          className="h-7 text-xs text-right bg-white border-[#c9b0e8] w-20"
                        />
                      </div>
                    ) : formatMoney(unitCost)}
                  </td>
                  <td className="px-4 py-2 text-right font-financial text-[#777169]">
                    {formatMoney(unitSelling)}
                  </td>
                  <td className={`px-4 py-2 text-right font-financial font-semibold ${itemProfit < 0 ? 'text-[#a53a2d]' : 'text-[#1a6b3a]'}`}>
                    {formatMoney(itemProfit)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

