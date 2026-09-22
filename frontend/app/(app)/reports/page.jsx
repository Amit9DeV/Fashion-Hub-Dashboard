"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import { 
  Calendar, Download, TrendingUp, RefreshCcw, DollarSign, 
  ReceiptText, Package, AlertCircle, ShoppingBag, ArrowDownRight,
  Edit2, Save, X
} from "lucide-react";
import { formatMoney, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/src/services/api";

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
      alert("Failed to fetch reports. Please try again.");
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
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center justify-between gap-4 text-xs font-medium text-[#5f584e]">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}
                </div>
                <span className="font-semibold text-[#151515]">
                  {isMoney ? formatMoney(entry.value) : entry.value.toLocaleString()}
                </span>
              </div>
            ))}
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

        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-md border border-[#e6e0d5] shadow-sm">
          <select 
            value={preset} 
            onChange={handlePresetChange}
            className="h-9 rounded border border-[#e6e0d5] bg-[#faf9f6] px-3 text-xs font-medium text-[#151515] outline-none focus:border-[#c9963e]"
          >
            {PRESET_DATES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          
          <form onSubmit={handleCustomFilter} className="flex items-center gap-2">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-auto h-9 text-xs bg-[#faf9f6]" required />
            <span className="text-[#8a847a] text-xs">to</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-auto h-9 text-xs bg-[#faf9f6]" required />
            <Button type="submit" variant="outline" size="sm" className="h-9 px-3 bg-[#faf9f6]">
              <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
            </Button>
          </form>
          
          <div className="w-px h-6 bg-[#dfd8cc] mx-1"></div>
          
          <Button onClick={handleExport} className="h-9 bg-[#1a6b3a] text-white hover:bg-[#134d2a] transition-colors shadow-sm">
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
        <div className="border-b border-[#f0ede7] px-6 py-5 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#151515]">Product Performance</h3>
            <p className="text-xs text-[#8a847a] mt-1">Identify which items drive your business</p>
          </div>
          <div className="flex bg-[#faf9f6] p-1 rounded-md border border-[#e6e0d5]">
            <button 
              onClick={() => setProductTab("units")} 
              className={`px-3 py-1.5 text-xs font-semibold rounded ${productTab === 'units' ? 'bg-white shadow-sm text-[#151515]' : 'text-[#8a847a]'}`}
            >
              Best Sellers
            </button>
            <button 
              onClick={() => setProductTab("profit")} 
              className={`px-3 py-1.5 text-xs font-semibold rounded ${productTab === 'profit' ? 'bg-white shadow-sm text-[#1a6b3a]' : 'text-[#8a847a]'}`}
            >
              Most Profitable
            </button>
            <button 
              onClick={() => setProductTab("slow")} 
              className={`px-3 py-1.5 text-xs font-semibold rounded ${productTab === 'slow' ? 'bg-white shadow-sm text-[#a53a2d]' : 'text-[#8a847a]'}`}
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

function ExpandedBillDetails({ bill, onUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(bill.items.map(i => ({ 
      ...i, 
      unitCostPaisa: i.unitCostPaisa || i.costPricePaisa || 0,
      sellingPricePaisa: i.sellingPricePaisa || 0
    })));
  }, [bill, isEditing]);

  const handleItemChange = (idx, field, val) => {
    const newItems = [...items];
    if (field === "unitCostPaisa" || field === "costPricePaisa" || field === "sellingPricePaisa") {
      const numVal = Math.round(Number(val) * 100);
      newItems[idx][field] = numVal;
      if (field === "unitCostPaisa") newItems[idx]["costPricePaisa"] = numVal;
      if (field === "costPricePaisa") newItems[idx]["unitCostPaisa"] = numVal;
    } else if (field === "quantity") {
      newItems[idx][field] = parseInt(val) || 0;
    } else {
      newItems[idx][field] = val;
    }
    setItems(newItems);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Fetch full order to get all fields needed for updateSale
      const fullOrderResponse = await api.orders.getById(bill.id);
      const fullOrder = fullOrderResponse.order;
      
      const payload = {
        items: items.map(i => ({
          productId: i.productId?.toString(),
          variantId: i.variantId?.toString(),
          quantity: i.quantity,
          overriddenPricePaisa: i.sellingPricePaisa,
          overriddenCostPaisa: i.unitCostPaisa ?? i.costPricePaisa ?? 0,
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
        // Always use a fresh idempotency key for edits to avoid conflicts
        idempotencyKey: `edit-${bill.id}-${Date.now()}`,
        completedAt: fullOrder.completedAt,
      };
      
      // Use orders.update (PUT /api/orders/:id) which routes through the same updateSale service
      await api.orders.update(bill.id, payload);
      setIsEditing(false);
      onUpdated();
    } catch (e) {
      alert("Failed to update bill: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded border border-[#dfd8cc] bg-white overflow-hidden">
      <div className="bg-[#f5f2ee] px-4 py-2 flex justify-between items-center border-b border-[#dfd8cc]">
        <h4 className="font-bold text-xs text-[#5f584e] uppercase tracking-wider">Bill Items</h4>
        {!isEditing ? (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-7 px-2 text-xs text-[#1a3a7a] hover:bg-[#e6f0ff]">
            <Edit2 size={12} className="mr-1" /> Edit Items
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={saving} className="h-7 px-2 text-xs text-[#a53a2d] hover:bg-[#ffe6e6]">
              <X size={12} className="mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 px-2 text-xs bg-[#1a6b3a] hover:bg-[#134d2a] text-white">
              {saving ? <RefreshCcw size={12} className="animate-spin mr-1" /> : <Save size={12} className="mr-1" />} Save
            </Button>
          </div>
        )}
      </div>
      <table className="w-full text-xs text-left sub-table">
        <thead className="bg-[#faf9f6] text-[#8a847a]">
          <tr>
            <th className="px-4 py-2 font-semibold">Item</th>
            <th className="px-4 py-2 font-semibold text-center w-20">Qty</th>
            <th className="px-4 py-2 font-semibold text-right w-28">Cost Price</th>
            <th className="px-4 py-2 font-semibold text-right w-28">Selling Price</th>
            <th className="px-4 py-2 font-semibold text-right">Item Profit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f5f2ee]">
          {(isEditing ? items : bill.items).map((item, idx) => {
            // In view mode: costPricePaisa is per-unit from report aggregation; fall back to totalItemCostPaisa/qty
            // In edit mode: unitCostPaisa is initialized from costPricePaisa and updated by user
            const displayCost = isEditing
              ? (item.unitCostPaisa ?? item.costPricePaisa ?? 0)
              : (item.costPricePaisa || (item.totalItemCostPaisa > 0 ? Math.round(item.totalItemCostPaisa / item.quantity) : 0));
            // itemProfit: in edit mode compute from current editable values; in view use pre-computed totals
            const itemProfit = isEditing
              ? (item.sellingPricePaisa - displayCost) * item.quantity
              : item.totalItemSalesPaisa - item.totalItemCostPaisa;

            return (
              <tr key={idx} className={isEditing ? "bg-blue-50/30" : ""}>
                <td className="px-4 py-2 font-medium">
                  {isEditing ? (
                    <Input 
                      value={item.productName} 
                      onChange={e => handleItemChange(idx, "productName", e.target.value)}
                      className="h-7 text-xs bg-white border-[#dfd8cc]" 
                    />
                  ) : (
                    <>{item.productName} <span className="text-[#8a847a]">({item.sku})</span></>
                  )}
                </td>
                <td className="px-4 py-2 text-center">
                  {isEditing ? (
                    <Input 
                      type="number" min="1" 
                      value={item.quantity} 
                      onChange={e => handleItemChange(idx, "quantity", e.target.value)}
                      className="h-7 text-xs text-center bg-white border-[#dfd8cc] w-16 mx-auto" 
                    />
                  ) : item.quantity}
                </td>
                <td className="px-4 py-2 text-right font-financial text-[#777169]">
                  {isEditing ? (
                    <div className="flex items-center justify-end">
                      <span className="mr-1 text-[#8a847a]">₹</span>
                      <Input 
                        type="number" step="0.01" min="0"
                        value={displayCost / 100} 
                        onChange={e => handleItemChange(idx, "unitCostPaisa", e.target.value)}
                        className="h-7 text-xs text-right bg-white border-[#dfd8cc] w-20" 
                      />
                    </div>
                  ) : formatMoney(displayCost)}
                </td>
                <td className="px-4 py-2 text-right font-financial text-[#777169]">
                  {isEditing ? (
                    <div className="flex items-center justify-end">
                      <span className="mr-1 text-[#8a847a]">₹</span>
                      <Input 
                        type="number" step="0.01" min="0"
                        value={item.sellingPricePaisa / 100} 
                        onChange={e => handleItemChange(idx, "sellingPricePaisa", e.target.value)}
                        className="h-7 text-xs text-right bg-white border-[#dfd8cc] w-20" 
                      />
                    </div>
                  ) : formatMoney(item.sellingPricePaisa)}
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
  );
}

