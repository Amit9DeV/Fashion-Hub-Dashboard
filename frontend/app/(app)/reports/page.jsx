"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar, Download, TrendingUp, RefreshCcw } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/src/services/api";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchReport = async (start = "", end = "") => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (start) query.append("startDate", start);
      if (end) query.append("endDate", end);
      
      const data = await api.reports.getSales(query.toString());
      setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    fetchReport(startDate, endDate);
  };

  const handleExport = () => {
    // Stub for CSV export
    alert("CSV Export will be available in the next release!");
  };

  if (loading && !report) {
    return <div className="grid min-h-[500px] place-items-center text-sm text-[#706a61]">Loading analytics...</div>;
  }

  const CustomTooltip = ({ active, payload, label, isMoney }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-md border bg-white p-3 shadow-sm">
          <p className="mb-2 text-xs font-semibold text-[#706a61]">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm font-medium">
              <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}: {isMoney ? formatMoney(entry.value) : entry.value}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-7 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#dfd8cc] pb-6 gap-4">
        <div>
          <p className="eyebrow flex items-center gap-2" style={{ color: '#1a6b3a' }}>
            <span style={{ width: 16, height: 1, background: '#1a6b3a', display: 'inline-block' }} />
            Analytics
          </p>
          <h2 className="page-headline" style={{ marginTop: 10, fontSize: 36 }}>
            Store Reports
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleFilter} className="flex flex-wrap items-center gap-2">
            <Input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="w-auto h-9 text-xs"
            />
            <span className="text-gray-400">to</span>
            <Input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="w-auto h-9 text-xs"
            />
            <Button type="submit" variant="outline" size="sm" className="h-9 px-3">
              <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
            </Button>
          </form>
          <Button variant="gold" size="sm" className="h-9" onClick={handleExport}>
            <Download size={15} className="mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {report && (
        <>
          <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Total Revenue" value={formatMoney(report.totals.totalRevenuePaisa)} icon={TrendingUp} />
            <KpiCard title="Total Orders" value={report.totals.totalOrders.toString()} icon={Calendar} />
            <KpiCard title="Total Tax Collected" value={formatMoney(report.totals.totalTaxPaisa)} icon={TrendingUp} />
            <KpiCard title="Total Discounts" value={formatMoney(report.totals.totalDiscountPaisa)} icon={TrendingUp} />
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            {/* Revenue Chart */}
            <div className="rounded-md border bg-white flex flex-col">
              <div className="border-b px-5 py-4">
                <h3 className="font-semibold text-sm">Daily Revenue Trend</h3>
              </div>
              <div className="flex-1 p-5 min-h-[300px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#706a61" }} dy={10} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: "#706a61" }}
                      tickFormatter={(val) => `₹${val/100}`}
                      dx={-10}
                    />
                    <Tooltip content={<CustomTooltip isMoney={true} />} />
                    <Line type="monotone" dataKey="revenuePaisa" name="Revenue" stroke="#1a3a7a" strokeWidth={3} dot={{ r: 3, fill: "#1a3a7a" }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Split */}
            <div className="rounded-md border bg-white flex flex-col">
              <div className="border-b px-5 py-4">
                <h3 className="font-semibold text-sm">Payment Methods</h3>
              </div>
              <div className="flex-1 p-5">
                <div className="space-y-4">
                  {report.paymentSplit.map((method, idx) => {
                    const total = report.paymentSplit.reduce((s, m) => s + m.totalPaisa, 0);
                    const pct = total > 0 ? Math.round((method.totalPaisa / total) * 100) : 0;
                    return (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-[#5f584e]">{method.method}</span>
                          <span className="font-financial font-semibold">{formatMoney(method.totalPaisa)}</span>
                        </div>
                        <div className="h-2 w-full bg-[#f0ede7] rounded-full overflow-hidden">
                          <div className="h-full bg-[#1a3a7a]" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-right text-[#706a61] mt-1">{pct}% of total</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Category Performance */}
          <section className="rounded-md border bg-white">
            <div className="border-b px-5 py-4">
              <h3 className="font-semibold text-sm">Category Performance</h3>
            </div>
            <div className="p-5 h-[350px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.categoryPerformance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#706a61" }} dy={10} />
                  <YAxis 
                    yAxisId="left"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: "#706a61" }}
                    tickFormatter={(val) => `₹${val/100}`}
                    dx={-10}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: "#706a61" }}
                    dx={10}
                  />
                  <Tooltip content={<CustomTooltip isMoney={true} />} />
                  <Bar yAxisId="left" dataKey="revenuePaisa" name="Revenue" fill="#1a5a5a" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function KpiCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-md border bg-white p-5">
      <div className="flex justify-between items-start">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#706a61]">{title}</p>
        <Icon size={16} className="text-[#c9963e]" />
      </div>
      <p className="font-financial mt-4 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
