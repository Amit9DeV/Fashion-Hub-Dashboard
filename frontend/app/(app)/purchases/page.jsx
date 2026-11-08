"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Truck,
  Plus,
  PackageCheck,
  Building2,
  Calendar,
  AlertCircle,
  Clock,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  X,
  Boxes,
  ChevronDown,
  ChevronRight,
  Printer,
  Download,
  MessageCircle,
  FileText,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney, formatDate } from "@/lib/utils";
import { api } from "@/src/services/api";
import { toast } from "sonner";

export default function PurchasesPage() {
  const [activeTab, setActiveTab] = useState("orders"); // "orders" | "suppliers"
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [storeSettings, setStoreSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedPoId, setExpandedPoId] = useState(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL"); // "ALL" | "PENDING" | "RECEIVED"
  const [viewingPo, setViewingPo] = useState(null);

  // Modals
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [receivingId, setReceivingId] = useState(null);

  // Search & Filters
  const [orderQuery, setOrderQuery] = useState("");
  const [supplierQuery, setSupplierQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [poRes, supRes, setRes] = await Promise.allSettled([
        api.purchase.getOrders(),
        api.purchase.getSuppliers(),
        api.settings.get(),
      ]);

      if (poRes.status === "fulfilled") {
        setOrders(poRes.value?.orders || poRes.value || []);
      }
      if (supRes.status === "fulfilled") {
        setSuppliers(supRes.value?.data || supRes.value || []);
      }
      if (setRes.status === "fulfilled" && setRes.value?.settings) {
        setStoreSettings(setRes.value.settings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReceiveOrder = async (orderId, poNumber) => {
    if (
      !confirm(
        `Receive Purchase Order ${poNumber}? This will automatically add item quantities to live inventory, re-calculate Weighted Average Cost (WAC), and record a stock expense.`
      )
    ) {
      return;
    }

    setReceivingId(orderId);
    try {
      await api.purchase.receiveOrder(orderId);
      toast.success(`Purchase Order ${poNumber} marked as received! Stock updated.`);
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to receive purchase order");
    } finally {
      setReceivingId(null);
    }
  };

  const handleDeletePo = async (orderId) => {
    if (!confirm("Are you sure you want to delete this purchase order?")) return;
    try {
      await api.purchase.deleteOrder(orderId);
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
      toast.success("Purchase order deleted");
    } catch (err) {
      toast.error(err.message || "Failed to delete purchase order");
    }
  };

  // KPIs
  const totalValue = orders.reduce((sum, o) => sum + (o.totalAmountPaisa || 0), 0);
  const pendingCount = orders.filter((o) => o.status !== "RECEIVED").length;
  const receivedCount = orders.filter((o) => o.status === "RECEIVED").length;

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (orderStatusFilter === "PENDING") {
      result = result.filter((o) => o.status !== "RECEIVED");
    } else if (orderStatusFilter === "RECEIVED") {
      result = result.filter((o) => o.status === "RECEIVED");
    }

    if (!orderQuery.trim()) return result;
    const q = orderQuery.toLowerCase();
    return result.filter(
      (o) =>
        o.poNumber?.toLowerCase().includes(q) ||
        o.supplierSnapshot?.name?.toLowerCase().includes(q) ||
        o.notes?.toLowerCase().includes(q)
    );
  }, [orders, orderQuery, orderStatusFilter]);

  const filteredSuppliers = useMemo(() => {
    if (!supplierQuery.trim()) return suppliers;
    const q = supplierQuery.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.contactPerson?.toLowerCase().includes(q) ||
        s.mobile?.includes(q) ||
        s.gstin?.toLowerCase().includes(q)
    );
  }, [suppliers, supplierQuery]);

  const handleExportOrdersCsv = () => {
    if (!orders.length) return;
    const headers = ["PO Number", "Supplier", "GSTIN", "Order Date", "Expected Date", "Items Count", "Total Amount (Rs)", "Status", "Notes"];
    const rows = orders.map((o) => [
      `"${o.poNumber || ""}"`,
      `"${(o.supplierSnapshot?.name || "").replace(/"/g, '""')}"`,
      `"${o.supplierSnapshot?.gstin || ""}"`,
      `"${o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : ""}"`,
      `"${o.expectedDeliveryDate ? new Date(o.expectedDeliveryDate).toLocaleDateString("en-IN") : ""}"`,
      (o.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0),
      ((o.totalAmountPaisa || 0) / 100).toFixed(2),
      o.status || "PENDING",
      `"${(o.notes || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchase_orders_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Purchase orders exported to CSV");
  };

  const handleExportSuppliersCsv = () => {
    if (!suppliers.length) return;
    const headers = ["Supplier Name", "Contact Person", "Mobile", "Email", "GSTIN", "City", "State"];
    const rows = suppliers.map((s) => [
      `"${(s.name || "").replace(/"/g, '""')}"`,
      `"${(s.contactPerson || "").replace(/"/g, '""')}"`,
      `"${s.mobile || ""}"`,
      `"${s.email || ""}"`,
      `"${s.gstin || ""}"`,
      `"${s.address?.city || ""}"`,
      `"${s.address?.state || ""}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suppliers_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Suppliers exported to CSV");
  };

  return (
    <div className="space-y-7 pb-10">
      {/* ── Header ── */}
      <section className="flex flex-col justify-between gap-4 border-b border-[#dfd8cc] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow flex items-center gap-2" style={{ color: "#1a3a7a" }}>
            <span style={{ width: 16, height: 1, background: "#1a3a7a", display: "inline-block" }} />
            Procurement & Inward Stock
          </p>
          <h2 className="page-headline mt-2 text-2xl sm:text-3xl md:text-4xl">
            Purchase Orders & Suppliers
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#756e64]">
            Manage vendor purchase orders, receive bulk merchandise, and auto-update weighted inventory costs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            className="flex-1 sm:flex-initial"
            onClick={() => {
              setEditingSupplier(null);
              setIsSupplierModalOpen(true);
            }}
          >
            <Building2 size={16} className="mr-1.5" /> + Add Supplier
          </Button>
          <Button
            variant="gold"
            className="flex-1 sm:flex-initial"
            onClick={() => setIsPoModalOpen(true)}
          >
            <Plus size={16} className="mr-1.5" /> Create Purchase Order
          </Button>
        </div>
      </section>

      {/* ── KPI Row ── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md border bg-white p-4 shadow-sm" style={{ borderLeft: "3px solid #1a3a7a" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1a3a7a]">Total PO Value</p>
          <p className="mt-2 text-2xl font-bold font-financial text-[#1a3a7a]">{formatMoney(totalValue)}</p>
          <p className="text-[11px] text-[#706a61] mt-1">{orders.length} total purchase orders</p>
        </div>

        <div className="rounded-md border bg-white p-4 shadow-sm" style={{ borderLeft: "3px solid #8a5a10" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8a5a10]">Pending Inward</p>
          <p className="mt-2 text-2xl font-bold font-financial text-[#8a5a10]">{pendingCount}</p>
          <p className="text-[11px] text-[#706a61] mt-1">Awaiting delivery / receipt</p>
        </div>

        <div className="rounded-md border bg-white p-4 shadow-sm" style={{ borderLeft: "3px solid #1a6b3a" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1a6b3a]">Stock Received</p>
          <p className="mt-2 text-2xl font-bold font-financial text-[#1a6b3a]">{receivedCount}</p>
          <p className="text-[11px] text-[#706a61] mt-1">Stock added to inventory</p>
        </div>

        <div className="rounded-md border bg-white p-4 shadow-sm" style={{ borderLeft: "3px solid #5a2a7a" }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5a2a7a]">Active Suppliers</p>
          <p className="mt-2 text-2xl font-bold font-financial text-[#5a2a7a]">{suppliers.length}</p>
          <p className="text-[11px] text-[#706a61] mt-1">Registered vendors</p>
        </div>
      </section>

      {/* ── Tabs Navigation ── */}
      <div className="flex items-center gap-6 border-b border-[#dfd8cc]">
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "orders"
              ? "border-[#0b0b0b] text-[#0b0b0b]"
              : "border-transparent text-[#81796d] hover:text-[#0b0b0b]"
          }`}
        >
          <Truck size={16} /> Purchase Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("suppliers")}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "suppliers"
              ? "border-[#0b0b0b] text-[#0b0b0b]"
              : "border-transparent text-[#81796d] hover:text-[#0b0b0b]"
          }`}
        >
          <Building2 size={16} /> Suppliers Directory ({suppliers.length})
        </button>
      </div>

      {/* ── TAB 1: PURCHASE ORDERS ── */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative max-w-sm flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 size-4 text-[#8a847a]" />
                <Input
                  placeholder="Search by PO #, supplier, or note..."
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  className="pl-9 h-9 text-xs bg-white"
                />
              </div>
              <div className="inline-flex rounded-md border border-[#dfd8cc] p-0.5 bg-white text-xs">
                <button
                  type="button"
                  onClick={() => setOrderStatusFilter("ALL")}
                  className={`px-3 py-1 rounded font-medium transition-colors ${
                    orderStatusFilter === "ALL" ? "bg-[#0b0b0b] text-white" : "text-[#706a61] hover:text-[#0b0b0b]"
                  }`}
                >
                  All ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderStatusFilter("PENDING")}
                  className={`px-3 py-1 rounded font-medium transition-colors ${
                    orderStatusFilter === "PENDING" ? "bg-[#8a5a10] text-white" : "text-[#8a5a10] hover:bg-[#fff9ee]"
                  }`}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderStatusFilter("RECEIVED")}
                  className={`px-3 py-1 rounded font-medium transition-colors ${
                    orderStatusFilter === "RECEIVED" ? "bg-[#1a6b3a] text-white" : "text-[#1a6b3a] hover:bg-[#f0f9f4]"
                  }`}
                >
                  Received ({receivedCount})
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportOrdersCsv}
                className="h-9 px-3 text-xs text-[#5f584e] flex items-center gap-1.5"
                title="Export purchase orders to CSV"
              >
                <Download size={13} /> Export CSV
              </Button>
              <p className="text-xs text-[#8a847a] hidden sm:block">
                {filteredOrders.length} POs
              </p>
            </div>
          </div>

          <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-12 text-center text-sm text-[#706a61]">Loading purchase orders...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-16 text-center">
                <Truck className="mx-auto size-10 text-[#c9963e] opacity-70 mb-3" />
                <h3 className="font-semibold text-base text-[#0b0b0b]">No purchase orders found</h3>
                <p className="text-xs text-[#706a61] mt-1 max-w-sm mx-auto">
                  Create a purchase order when ordering stock from manufacturers or wholesale distributors.
                </p>
                <Button
                  variant="gold"
                  size="sm"
                  className="mt-4"
                  onClick={() => setIsPoModalOpen(true)}
                >
                  <Plus size={14} className="mr-1.5" /> Create First PO
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[850px]">
                  <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-wider text-[#81796d] border-b">
                    <tr>
                      <th className="px-3 py-3 font-semibold w-8"></th>
                      <th className="px-5 py-3 font-semibold">PO Number</th>
                      <th className="px-5 py-3 font-semibold">Supplier</th>
                      <th className="px-5 py-3 font-semibold">Order Date</th>
                      <th className="px-5 py-3 font-semibold">Expected Date</th>
                      <th className="px-5 py-3 font-semibold text-center">Items</th>
                      <th className="px-5 py-3 font-semibold text-right">Total Amount</th>
                      <th className="px-5 py-3 font-semibold text-center">Status</th>
                      <th className="px-5 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ede7]">
                    {filteredOrders.map((po) => {
                      const isReceived = po.status === "RECEIVED";
                      const totalQty = (po.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
                      const isExpanded = expandedPoId === po._id;

                      return (
                        <React.Fragment key={po._id}>
                          <tr className={`transition-colors ${isExpanded ? "bg-[#fffcf5]" : "hover:bg-[#faf9f6]"}`}>
                            <td className="pl-3 pr-1 py-3.5">
                              <button
                                type="button"
                                onClick={() => setExpandedPoId(isExpanded ? null : po._id)}
                                className="p-1 rounded text-[#81796d] hover:text-[#0b0b0b] hover:bg-[#eee9df] transition-colors"
                                title={isExpanded ? "Collapse items" : "View items"}
                              >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            </td>
                            <td className="px-5 py-3.5">
                              <button
                                type="button"
                                onClick={() => setViewingPo(po)}
                                className="font-mono text-xs font-bold text-[#1a3a7a] hover:text-[#0b0b0b] hover:underline flex items-center gap-1 text-left"
                                title="Click to view & print Purchase Order"
                              >
                                {po.poNumber}
                              </button>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="font-semibold text-[#0b0b0b]">{po.supplierSnapshot?.name || "Supplier"}</p>
                              {po.supplierSnapshot?.gstin && (
                                <p className="text-[10px] font-mono text-[#8a847a] mt-0.5">
                                  GST: {po.supplierSnapshot.gstin}
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-xs text-[#5f584e]">
                              {formatDate(po.createdAt)}
                            </td>
                            <td className="px-5 py-3.5 text-xs text-[#5f584e]">
                              {po.expectedDeliveryDate
                                ? new Date(po.expectedDeliveryDate).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                            </td>
                            <td className="px-5 py-3.5 text-center text-xs font-medium">
                              <button
                                type="button"
                                onClick={() => setExpandedPoId(isExpanded ? null : po._id)}
                                className="rounded bg-[#f0ede7] px-2 py-0.5 font-semibold text-[#0b0b0b] hover:bg-[#dfd8cc] transition-colors"
                                title="View line items"
                              >
                                {totalQty} unit{totalQty !== 1 ? "s" : ""}
                              </button>
                            </td>
                            <td className="px-5 py-3.5 text-right font-financial font-semibold text-sm text-[#0b0b0b]">
                              {formatMoney(po.totalAmountPaisa)}
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                  isReceived
                                    ? "bg-[#f0f9f4] text-[#1a6b3a] border border-[#a3d9b8]"
                                    : "bg-[#fdf8f0] text-[#8a5a10] border border-[#e6c97a]"
                                }`}
                              >
                                {isReceived ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                                {po.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {!isReceived ? (
                                  <Button
                                    size="sm"
                                    variant="gold"
                                    disabled={receivingId === po._id}
                                    onClick={() => handleReceiveOrder(po._id, po.poNumber)}
                                    className="h-7 text-xs px-2.5 font-semibold flex items-center gap-1"
                                    title="Mark as received and add to inventory stock"
                                  >
                                    <PackageCheck size={13} />
                                    {receivingId === po._id ? "Receiving..." : "Receive Stock"}
                                  </Button>
                                ) : (
                                  <span className="text-[11px] text-[#1a6b3a] font-medium flex items-center gap-1">
                                    <CheckCircle2 size={13} /> Stock added
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setViewingPo(po)}
                                  className="p-1 text-[#9b7740] hover:text-[#5d4624] transition-colors"
                                  title="View & Print Purchase Order"
                                >
                                  <Printer size={15} />
                                </button>

                                {!isReceived && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePo(po._id)}
                                    className="p-1 text-red-500 hover:text-red-700 transition-colors"
                                    title="Delete purchase order"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {/* Expanded Items Row */}
                          {isExpanded && (po.items || []).length > 0 && (
                            <tr key={`${po._id}-expanded`} className="bg-[#fffaf5]">
                              <td colSpan="9" className="px-6 py-4 border-t border-[#f0ede7]">
                                <div className="rounded-md border border-[#e6e0d5] overflow-hidden">
                                  <div className="bg-[#f5f2ee] px-4 py-2 flex items-center justify-between border-b border-[#dfd8cc]">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#5f584e]">
                                      PO Items — {po.poNumber}
                                    </h4>
                                    {isReceived && (
                                      <span className="text-[10px] text-[#1a6b3a] font-semibold flex items-center gap-1 bg-[#f0f9f4] px-2 py-0.5 rounded border border-[#a3d9b8]">
                                        <CheckCircle2 size={10} /> Stock Received
                                      </span>
                                    )}
                                  </div>
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-[#faf9f6] text-[#8a847a] uppercase">
                                      <tr>
                                        <th className="px-4 py-2.5 font-semibold">Product / SKU</th>
                                        <th className="px-4 py-2.5 font-semibold text-center w-20">Qty</th>
                                        <th className="px-4 py-2.5 font-semibold text-right w-28">Unit Cost</th>
                                        <th className="px-4 py-2.5 font-semibold text-right w-28">Line Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#f5f2ee]">
                                      {(po.items || []).map((item, idx) => (
                                        <tr key={idx} className="hover:bg-[#faf9f6]">
                                          <td className="px-4 py-2.5">
                                            <p className="font-medium text-[#0b0b0b]">{item.productName}</p>
                                            <p className="text-[10px] text-[#706a61] font-mono mt-0.5">
                                              {[item.sku, item.color, item.size].filter(Boolean).join(" · ")}
                                            </p>
                                          </td>
                                          <td className="px-4 py-2.5 text-center font-semibold">{item.quantity}</td>
                                          <td className="px-4 py-2.5 text-right font-financial text-[#5f584e]">
                                            {formatMoney(item.costPricePaisa || 0)}
                                          </td>
                                          <td className="px-4 py-2.5 text-right font-financial font-semibold text-[#0b0b0b]">
                                            {formatMoney(item.totalPaisa || (item.quantity * (item.costPricePaisa || 0)))}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot className="bg-[#faf9f6] border-t border-[#e6e0d5]">
                                      <tr>
                                        <td colSpan="3" className="px-4 py-2.5 text-right text-xs font-bold text-[#5f584e] uppercase tracking-wider">
                                          Total
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-financial font-bold text-[#0b0b0b]">
                                          {formatMoney(po.totalAmountPaisa)}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: SUPPLIERS DIRECTORY ── */}
      {activeTab === "suppliers" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-[#8a847a]" />
              <Input
                placeholder="Search suppliers by name, phone, or GST..."
                value={supplierQuery}
                onChange={(e) => setSupplierQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSuppliersCsv}
                className="h-9 px-3 text-xs text-[#5f584e] flex items-center gap-1.5"
                title="Export suppliers directory to CSV"
              >
                <Download size={13} /> Export CSV
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={() => {
                  setEditingSupplier(null);
                  setIsSupplierModalOpen(true);
                }}
                className="h-9 text-xs"
              >
                <Plus size={14} className="mr-1.5" /> Add New Supplier
              </Button>
            </div>
          </div>

          <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-12 text-center text-sm text-[#706a61]">Loading suppliers...</div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="py-16 text-center">
                <Building2 className="mx-auto size-10 text-[#c9963e] opacity-70 mb-3" />
                <h3 className="font-semibold text-base text-[#0b0b0b]">No suppliers registered</h3>
                <p className="text-xs text-[#706a61] mt-1 max-w-sm mx-auto">
                  Add wholesale distributors, mills, or garment vendors to order inventory.
                </p>
                <Button
                  variant="gold"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setEditingSupplier(null);
                    setIsSupplierModalOpen(true);
                  }}
                >
                  <Plus size={14} className="mr-1.5" /> Add Supplier
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[750px]">
                  <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-wider text-[#81796d] border-b">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Supplier Name</th>
                      <th className="px-5 py-3 font-semibold">Contact Person</th>
                      <th className="px-5 py-3 font-semibold">Contact Info</th>
                      <th className="px-5 py-3 font-semibold">GSTIN</th>
                      <th className="px-5 py-3 font-semibold">Location</th>
                      <th className="px-5 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ede7]">
                    {filteredSuppliers.map((s) => (
                      <tr key={s._id} className="hover:bg-[#faf9f6] transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-[#0b0b0b]">
                          {s.name}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#5f584e]">
                          {s.contactPerson || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#5f584e]">
                          {s.mobile && <div>{s.mobile}</div>}
                          {s.email && <div className="text-[11px] text-[#8a847a]">{s.email}</div>}
                          {!s.mobile && !s.email && "—"}
                        </td>
                        <td className="px-5 py-3.5 text-xs font-mono text-[#9b7740]">
                          {s.gstin || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#706a61]">
                          {[s.address?.city, s.address?.state].filter(Boolean).join(", ") || "—"}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2.5"
                            onClick={() => {
                              setEditingSupplier(s);
                              setIsSupplierModalOpen(true);
                            }}
                          >
                            <Edit2 size={12} className="mr-1" /> Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CREATE PURCHASE ORDER MODAL ── */}
      {isPoModalOpen && (
        <CreatePurchaseOrderModal
          isOpen={isPoModalOpen}
          onClose={() => setIsPoModalOpen(false)}
          suppliers={suppliers}
          onCreated={() => {
            setIsPoModalOpen(false);
            loadData();
          }}
          onAddSupplier={() => {
            setEditingSupplier(null);
            setIsSupplierModalOpen(true);
          }}
        />
      )}

      {/* ── ADD / EDIT SUPPLIER MODAL ── */}
      {isSupplierModalOpen && (
        <SupplierModal
          isOpen={isSupplierModalOpen}
          onClose={() => {
            setIsSupplierModalOpen(false);
            setEditingSupplier(null);
          }}
          supplier={editingSupplier}
          onSaved={() => {
            setIsSupplierModalOpen(false);
            setEditingSupplier(null);
            loadData();
          }}
        />
      )}

      {/* ── VIEW / PRINT PURCHASE ORDER MODAL ── */}
      {viewingPo && (
        <PurchaseOrderViewModal
          isOpen={!!viewingPo}
          onClose={() => setViewingPo(null)}
          po={viewingPo}
          storeSettings={storeSettings}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Modal: View & Print Purchase Order
// ─────────────────────────────────────────────────────────────────────────────
function PurchaseOrderViewModal({ isOpen, onClose, po, storeSettings }) {
  if (!isOpen || !po) return null;

  const totalQty = (po.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
  const supplierMobile = po.supplierSnapshot?.mobile || "";
  const cleanMobile = supplierMobile.replace(/\D/g, "");
  const waNumber = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
  const storeName = storeSettings?.storeName || "Fashion Hub";

  const handleShareWhatsApp = () => {
    if (!waNumber) {
      toast.warning("No mobile number recorded for this supplier.");
      return;
    }
    const message = encodeURIComponent(
      `Dear ${po.supplierSnapshot?.name || "Vendor"},\n\nGreetings from ${storeName}! Please find Purchase Order #${po.poNumber} for ${totalQty} units totaling ${formatMoney(po.totalAmountPaisa)}.\n\nThank you!`
    );
    window.open(`https://wa.me/${waNumber}?text=${message}`, "_blank");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden border border-[#e8e3da] flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Controls Toolbar (Hidden in Print) */}
        <div className="no-print bg-[#faf9f6] border-b border-[#dfd8cc] px-6 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Truck size={17} className="text-[#1a3a7a]" />
            <span className="text-xs font-mono font-bold text-[#1a3a7a]">
              {po.poNumber}
            </span>
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                po.status === "RECEIVED"
                  ? "bg-[#f0f9f4] text-[#1a6b3a] border border-[#a3d9b8]"
                  : "bg-[#fdf8f0] text-[#8a5a10] border border-[#e6c97a]"
              }`}
            >
              {po.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {waNumber && (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleShareWhatsApp}
                className="h-8 px-2.5 text-xs text-[#128C7E] border-[#25D366]/40 hover:bg-[#25D366]/10 flex items-center gap-1.5"
                title="Share PO with Supplier via WhatsApp"
              >
                <MessageCircle size={13} className="text-[#25D366]" /> Share
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => window.print()}
              className="h-8 px-3 text-xs bg-white text-black hover:bg-gray-100 border-[#dfd8cc] font-semibold flex items-center gap-1.5"
            >
              <Printer size={13} /> Print
            </Button>

            <button
              onClick={onClose}
              className="p-1 rounded text-[#8a847a] hover:text-[#0b0b0b] transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable PO Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm bg-white" id="printable-po">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-[#dfd8cc] pb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9b7740]">
                Purchase Order
              </p>
              <h2 className="text-2xl font-serif font-bold text-[#0b0b0b] mt-1">
                {storeName}
              </h2>
              {storeSettings?.address && (
                <p className="text-xs text-[#706a61] mt-0.5">
                  {storeSettings.address}
                </p>
              )}
              {storeSettings?.phone && (
                <p className="text-xs text-[#706a61]">Phone: {storeSettings.phone}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-mono text-base font-bold text-[#1a3a7a]">{po.poNumber}</p>
              <p className="text-xs text-[#706a61] mt-1">
                Date: {formatDate(po.createdAt)}
              </p>
              {po.expectedDeliveryDate && (
                <p className="text-xs text-[#706a61]">
                  Expected: {new Date(po.expectedDeliveryDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Supplier Info */}
          <div className="rounded-lg bg-[#faf9f6] border border-[#e8e3da] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a847a] mb-1">
              Vendor / Supplier
            </p>
            <h4 className="font-bold text-sm text-[#0b0b0b]">
              {po.supplierSnapshot?.name || "Supplier"}
            </h4>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-[#5f584e]">
              <div>
                {po.supplierSnapshot?.contactPerson && (
                  <p>Attn: {po.supplierSnapshot.contactPerson}</p>
                )}
                {po.supplierSnapshot?.mobile && (
                  <p>Mobile: {po.supplierSnapshot.mobile}</p>
                )}
                {po.supplierSnapshot?.email && (
                  <p>Email: {po.supplierSnapshot.email}</p>
                )}
              </div>
              <div className="text-right">
                {po.supplierSnapshot?.gstin && (
                  <p className="font-mono text-[11px] text-[#9b7740]">
                    GSTIN: {po.supplierSnapshot.gstin}
                  </p>
                )}
                {po.notes && (
                  <p className="text-[#8a847a] italic mt-1">Note: {po.notes}</p>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="rounded-lg border border-[#e6e0d5] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf9f6] text-[#706a61] uppercase border-b border-[#e6e0d5]">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Item & Description</th>
                  <th className="px-4 py-2.5 font-semibold">SKU / Code</th>
                  <th className="px-4 py-2.5 font-semibold text-center w-16">Qty</th>
                  <th className="px-4 py-2.5 font-semibold text-right w-24">Unit Cost</th>
                  <th className="px-4 py-2.5 font-semibold text-right w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ede7]">
                {(po.items || []).map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#faf9f6]">
                    <td className="px-4 py-3 font-medium text-[#0b0b0b]">
                      {item.productName}
                      {(item.color || item.size) && (
                        <span className="block text-[11px] text-[#706a61]">
                          {[item.color, item.size].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#5f584e]">
                      {item.sku || "—"}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-[#0b0b0b]">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right font-financial text-[#5f584e]">
                      {formatMoney(item.costPricePaisa || 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-financial font-semibold text-[#0b0b0b]">
                      {formatMoney(item.totalPaisa || ((item.quantity || 1) * (item.costPricePaisa || 0)))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#faf9f6] border-t border-[#dfd8cc]">
                <tr>
                  <td colSpan="2" className="px-4 py-3 font-bold text-xs text-[#5f584e] uppercase">
                    Total Order Value
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-xs text-[#0b0b0b]">
                    {totalQty}
                  </td>
                  <td></td>
                  <td className="px-4 py-3 text-right font-financial font-extrabold text-sm text-[#1a3a7a]">
                    {formatMoney(po.totalAmountPaisa)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="pt-4 border-t border-[#dfd8cc] text-[11px] text-[#8a847a] flex justify-between items-center">
            <p>Authorised Signatory: _________________________</p>
            <p>Fashion Hub Procurement Desk</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Modal: Create Purchase Order
// ─────────────────────────────────────────────────────────────────────────────
function CreatePurchaseOrderModal({ isOpen, onClose, suppliers, onCreated, onAddSupplier }) {
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Variant selector
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!productQuery.trim()) {
      setProductResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.products.search(productQuery);
        setProductResults(data.items || []);
      } catch {
        setProductResults([]);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [productQuery]);

  const addItem = (variant) => {
    const existing = items.find((i) => i.variantId === variant.variantId);
    if (existing) {
      setItems((prev) =>
        prev.map((i) =>
          i.variantId === variant.variantId ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: variant.productId,
          variantId: variant.variantId,
          productName: variant.productName,
          sku: variant.sku,
          color: variant.color,
          size: variant.size,
          quantity: 1,
          costPrice: variant.costPricePaisa ? (variant.costPricePaisa / 100).toString() : "",
        },
      ]);
    }
    setProductQuery("");
    setProductResults([]);
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index][field] = value;
      return copy;
    });
  };

  const totalAmountPaisa = items.reduce((sum, item) => {
    const qty = parseInt(item.quantity, 10) || 0;
    const cost = Math.round(parseFloat(item.costPrice || 0) * 100);
    return sum + qty * cost;
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierId) {
      toast.error("Please select a supplier");
      return;
    }
    if (items.length === 0) {
      toast.error("Please add at least one product item to the order");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        supplierId,
        expectedDeliveryDate: expectedDate ? new Date(expectedDate) : undefined,
        notes,
        items: items.map((item) => {
          const costPaisa = Math.round(parseFloat(item.costPrice || 0) * 100);
          return {
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            sku: item.sku,
            quantity: parseInt(item.quantity, 10) || 1,
            costPricePaisa: costPaisa,
            totalPaisa: (parseInt(item.quantity, 10) || 1) * costPaisa,
          };
        }),
      };

      await api.purchase.createOrder(payload);
      toast.success("Purchase Order created successfully!");
      onCreated();
    } catch (err) {
      toast.error(err.message || "Failed to create purchase order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden border border-[#e8e3da] flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b bg-[#faf9f6] px-6 py-4">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-[#c9963e]" />
            <h3 className="font-semibold text-base text-[#0b0b0b]">Create Purchase Order</h3>
          </div>
          <button onClick={onClose} className="text-[#8a847a] hover:text-[#0b0b0b]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Supplier & Date */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                  Supplier *
                </label>
                <button
                  type="button"
                  onClick={onAddSupplier}
                  className="text-xs text-[#9b7740] hover:underline font-medium"
                >
                  + New Supplier
                </button>
              </div>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full h-10 rounded-md border bg-white px-3 text-xs outline-none focus:border-[#9b7740]"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} {s.gstin ? `(${s.gstin})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                Expected Delivery Date
              </label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="h-10 text-xs bg-white"
              />
            </div>
          </div>

          {/* Add Item Search */}
          <div className="space-y-2 pt-2 border-t">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
              Search Product / SKU to Order
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 size-4 text-[#8a847a]" />
              <Input
                placeholder="Scan barcode or type SKU / name..."
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                className="pl-9 h-10 text-xs bg-white"
              />
            </div>

            {productResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-md border bg-white shadow-lg divide-y">
                {productResults.map((item) => (
                  <button
                    key={item.variantId}
                    type="button"
                    onClick={() => addItem(item)}
                    className="w-full px-3 py-2 text-left hover:bg-[#fffcf5] flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#0b0b0b]">{item.productName}</p>
                      <p className="text-[11px] text-[#706a61]">
                        {[item.sku, item.color, item.size].filter(Boolean).join(" · ")} · Current Stock: {item.stock}
                      </p>
                    </div>
                    <span className="font-semibold text-[#c9963e]">+ Add</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
              Order Items ({items.length})
            </label>
            {items.length === 0 ? (
              <p className="text-xs text-[#8a847a] italic py-2">No items added yet. Search above to add items.</p>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#faf9f6] text-[#81796d] border-b">
                    <tr>
                      <th className="px-3 py-2">Product / SKU</th>
                      <th className="px-3 py-2 w-20 text-center">Qty</th>
                      <th className="px-3 py-2 w-28 text-right">Cost (₹)</th>
                      <th className="px-3 py-2 w-28 text-right">Total (₹)</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((item, idx) => {
                      const qty = parseInt(item.quantity, 10) || 0;
                      const cost = parseFloat(item.costPrice || 0);
                      const lineTotal = qty * cost;

                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <p className="font-medium text-[#0b0b0b]">{item.productName}</p>
                            <p className="text-[10px] text-[#706a61] font-mono">
                              {[item.sku, item.color, item.size].filter(Boolean).join(" · ")}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                              className="h-7 text-center text-xs w-16 mx-auto font-semibold"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={item.costPrice}
                              onChange={(e) => updateItem(idx, "costPrice", e.target.value)}
                              className="h-7 text-right text-xs w-24 ml-auto"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-financial font-semibold">
                            ₹{lineTotal.toFixed(2)}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
              Notes / Delivery Terms
            </label>
            <Input
              placeholder="e.g. 50% advance paid, dispatch via BlueDart"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs bg-white"
            />
          </div>

          {/* Total Bar */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#faf9f6] border text-xs">
            <span className="font-semibold text-[#5f584e]">Total PO Amount:</span>
            <span className="font-financial text-xl font-bold text-[#1a3a7a]">
              {formatMoney(totalAmountPaisa)}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gold"
              size="sm"
              disabled={submitting || items.length === 0}
            >
              {submitting ? "Creating PO..." : "Create Purchase Order"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Modal: Add / Edit Supplier
// ─────────────────────────────────────────────────────────────────────────────
function SupplierModal({ isOpen, onClose, supplier, onSaved }) {
  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    mobile: "",
    email: "",
    gstin: "",
    city: "",
    state: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name || "",
        contactPerson: supplier.contactPerson || "",
        mobile: supplier.mobile || "",
        email: supplier.email || "",
        gstin: supplier.gstin || "",
        city: supplier.address?.city || "",
        state: supplier.address?.state || "",
      });
    } else {
      setForm({
        name: "",
        contactPerson: "",
        mobile: "",
        email: "",
        gstin: "",
        city: "",
        state: "",
      });
    }
  }, [supplier]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        gstin: form.gstin.trim().toUpperCase(),
        address: {
          city: form.city.trim(),
          state: form.state.trim(),
        },
      };

      if (supplier?._id) {
        await api.purchase.updateSupplier(supplier._id, payload);
        toast.success("Supplier updated successfully");
      } else {
        await api.purchase.createSupplier(payload);
        toast.success("Supplier created successfully");
      }
      onSaved();
    } catch (err) {
      toast.error(err.message || "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden border border-[#e8e3da]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b bg-[#faf9f6] px-6 py-4">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-[#c9963e]" />
            <h3 className="font-semibold text-base text-[#0b0b0b]">
              {supplier ? "Edit Supplier" : "Add Supplier"}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#8a847a] hover:text-[#0b0b0b]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
              Company / Vendor Name *
            </label>
            <Input
              required
              autoFocus
              placeholder="e.g. Raymond Mills Pvt Ltd"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-10 text-xs bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                Contact Person
              </label>
              <Input
                placeholder="Manager name"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="h-9 text-xs bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                Phone / Mobile
              </label>
              <Input
                placeholder="10-digit number"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                className="h-9 text-xs bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                Email
              </label>
              <Input
                type="email"
                placeholder="orders@vendor.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-9 text-xs bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                GSTIN
              </label>
              <Input
                placeholder="GST number"
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                className="h-9 text-xs font-mono uppercase bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                City
              </label>
              <Input
                placeholder="e.g. Surat / Mumbai"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="h-9 text-xs bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                State
              </label>
              <Input
                placeholder="e.g. Gujarat"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="h-9 text-xs bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" size="sm" disabled={saving}>
              {saving ? "Saving..." : supplier ? "Update Supplier" : "Add Supplier"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

