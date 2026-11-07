"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Calendar, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DateFilter({
  startDate = "",
  endDate = "",
  paymentMethod = "ALL",
  dueStatus = "ALL",
  status = "ALL",
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const [method, setMethod] = useState(searchParams.get("paymentMethod") || paymentMethod || "ALL");
  const [dues, setDues] = useState(searchParams.get("dueStatus") || dueStatus || "ALL");
  const [orderStatus, setOrderStatus] = useState(searchParams.get("status") || status || "ALL");

  const hasFilter = startDate || endDate || method !== "ALL" || dues !== "ALL" || orderStatus !== "ALL";

  const apply = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (start) params.set("startDate", start);
    else params.delete("startDate");
    if (end) params.set("endDate", end);
    else params.delete("endDate");
    if (method && method !== "ALL") params.set("paymentMethod", method);
    else params.delete("paymentMethod");
    if (dues && dues !== "ALL") params.set("dueStatus", dues);
    else params.delete("dueStatus");
    if (orderStatus && orderStatus !== "ALL") params.set("status", orderStatus);
    else params.delete("status");
    router.push(`${pathname}?${params.toString()}`);
  };

  const clear = () => {
    setStart("");
    setEnd("");
    setMethod("ALL");
    setDues("ALL");
    setOrderStatus("ALL");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("startDate");
    params.delete("endDate");
    params.delete("paymentMethod");
    params.delete("dueStatus");
    params.delete("status");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const setPreset = (type) => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    if (type === "TODAY") {
      setStart(todayStr);
      setEnd(todayStr);
    } else if (type === "MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      setStart(firstDay);
      setEnd(todayStr);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date Presets */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setPreset("TODAY")}
          className="rounded border border-[#dfd8cc] bg-white px-2 py-1 text-[11px] font-medium text-[#5f584e] hover:bg-[#faf9f6]"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setPreset("MONTH")}
          className="rounded border border-[#dfd8cc] bg-white px-2 py-1 text-[11px] font-medium text-[#5f584e] hover:bg-[#faf9f6]"
        >
          This Month
        </button>
      </div>

      {/* Date Pickers */}
      <div className="flex items-center gap-1.5 text-xs text-[#5f584e]">
        <Calendar size={13} className="text-[#9b7740]" />
      </div>
      <input
        type="date"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        className="h-8 rounded border border-[#dfd8cc] bg-white px-2 text-xs text-[#0b0b0b] outline-none focus:border-[#c9963e] transition-colors"
        title="From date"
      />
      <span className="text-xs text-[#8a847a]">–</span>
      <input
        type="date"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        className="h-8 rounded border border-[#dfd8cc] bg-white px-2 text-xs text-[#0b0b0b] outline-none focus:border-[#c9963e] transition-colors"
        title="To date"
      />

      {/* Payment Method Filter */}
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        className="h-8 rounded border border-[#dfd8cc] bg-white px-2 text-xs text-[#5f584e] outline-none focus:border-[#c9963e]"
      >
        <option value="ALL">All Payments</option>
        <option value="UPI">UPI</option>
        <option value="CASH">Cash</option>
        <option value="CARD">Card</option>
        <option value="OTHER">Other</option>
      </select>

      {/* Dues Filter */}
      <select
        value={dues}
        onChange={(e) => setDues(e.target.value)}
        className="h-8 rounded border border-[#dfd8cc] bg-white px-2 text-xs text-[#5f584e] outline-none focus:border-[#c9963e]"
      >
        <option value="ALL">All Dues Status</option>
        <option value="HAS_DUES">Has Dues (Unpaid)</option>
        <option value="PAID">Paid in Full</option>
      </select>

      {/* Order Status Filter */}
      <select
        value={orderStatus}
        onChange={(e) => setOrderStatus(e.target.value)}
        className="h-8 rounded border border-[#dfd8cc] bg-white px-2 text-xs text-[#5f584e] outline-none focus:border-[#c9963e]"
      >
        <option value="ALL">All Order Status</option>
        <option value="COMPLETED">Completed</option>
        <option value="RETURNED">Returned</option>
        <option value="PARTIALLY_RETURNED">Partially Returned</option>
        <option value="EXCHANGED">Exchanged</option>
      </select>

      <Button
        size="sm"
        variant="gold"
        className="h-8 px-3 text-xs font-semibold"
        onClick={apply}
      >
        Filter
      </Button>

      {hasFilter && (
        <button
          onClick={clear}
          className="inline-flex items-center gap-1 text-xs text-[#a53a2d] hover:text-[#8a1a1a] transition-colors font-medium ml-1"
          title="Clear all filters"
        >
          <X size={12} /> Clear
        </button>
      )}
    </div>
  );
}
