"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, MessageCircle, ChevronDown, ChevronRight, Package, ArrowLeft, ArrowRight, Printer, Pencil, Receipt, Download, Loader2, RotateCcw } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/utils";
import DeleteOrderButton from "@/components/orders/DeleteOrderButton";
import InvoiceModal from "@/components/invoice/InvoiceModal";
import { Button } from "@/components/ui/button";
import { api } from "@/src/services/api";
import { toast } from "sonner";

export default function OrdersTable({ orders, invoices = [], messages = [], pagination = {}, currentQuery = "", startDate = "", endDate = "" }) {
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState(null);
  const [sendingWaOrderId, setSendingWaOrderId] = useState(null);

  const invoiceByOrderId = new Map(
    invoices.filter(i => i.orderId).map((invoice) => [invoice.orderId.toString(), invoice])
  );
  const messageByOrderId = new Map(
    messages.filter(m => m.orderId).map((message) => [message.orderId.toString(), message])
  );

  const handleSendWhatsApp = async (order) => {
    const phone = order.customerSnapshot?.mobile;
    if (!phone) {
      toast.error("Customer does not have a phone number on this order");
      return;
    }
    const orderIdStr = order._id.toString();
    setSendingWaOrderId(orderIdStr);
    try {
      const res = await api.whatsapp.send({ orderId: orderIdStr });
      if (res.success) {
        toast.success(res.message || "WhatsApp invoice queued!");
      } else {
        throw new Error(res.message || "Failed to send");
      }
    } catch (err) {
      // Fallback: direct WhatsApp Web link
      const rawDigits = phone.replace(/\D/g, "");
      const waNumber = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;
      const msg = encodeURIComponent(`Hello ${order.customerSnapshot?.name || ""}, here is your bill for Invoice #${order.invoiceNumber} totaling ₹${((order.totalPaisa || 0) / 100).toFixed(2)} from Fashion Hub.`);
      window.open(`https://wa.me/${waNumber}?text=${msg}`, "_blank");
      toast.info("Opening WhatsApp chat directly");
    } finally {
      setSendingWaOrderId(null);
    }
  };

  const toggleExpand = (orderId) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  const { page = 1, totalPages = 1, total = orders.length } = pagination;

  const handleExportOrdersCsv = () => {
    if (!orders || orders.length === 0) return;
    const headers = ["Invoice No", "Order Date", "Customer Name", "Customer Mobile", "Items Count", "Subtotal (Rs)", "Discount (Rs)", "Tax (Rs)", "Total (Rs)", "Due (Rs)", "Payment Methods"];
    const rows = orders.map((o) => [
      o.invoiceNumber || "",
      o.completedAt ? new Date(o.completedAt).toLocaleDateString("en-IN") : "",
      `"${(o.customerSnapshot?.name || "Walk-in").replace(/"/g, '""')}"`,
      `"${(o.customerSnapshot?.mobile || "").replace(/"/g, '""')}"`,
      (o.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0),
      (o.subtotalPaisa || 0) / 100,
      (o.discountPaisa || 0) / 100,
      (o.taxPaisa || 0) / 100,
      (o.totalPaisa || 0) / 100,
      (o.duePaisa || 0) / 100,
      `"${(o.payments || []).map(p => p.method).join(" + ")}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between px-5 py-2.5 bg-[#faf9f6] border-b border-[#dfd8cc] text-xs">
        <span className="text-[#81796d] font-medium">{total} orders recorded</span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportOrdersCsv}
          className="h-7 px-2.5 text-xs text-[#5f584e] hover:text-[#0b0b0b] flex items-center gap-1.5"
        >
          <Download size={13} /> Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.13em] text-[#81796d]">
            <tr>
              <th className="px-5 py-3 font-semibold w-10"></th>
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
              const orderIdStr = order._id.toString();
              const invoice = invoiceByOrderId.get(orderIdStr);
              const message = messageByOrderId.get(orderIdStr);
              const isExpanded = expandedOrderId === orderIdStr;
              const totalItemsCount = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

              return (
                <tr key={orderIdStr} className="border-t hover:bg-[#fffcf5] group transition-colors">
                  <td className="pl-4 pr-1 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => toggleExpand(orderIdStr)}
                      className="p-1 rounded text-[#81796d] hover:text-[#0b0b0b] hover:bg-[#eee9df] transition-colors"
                      title={isExpanded ? "Collapse item details" : "Expand item details"}
                    >
                      {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText size={15} className="text-[#9b7740] shrink-0" />
                      <button
                        type="button"
                        onClick={() => setActiveInvoiceOrder(order)}
                        className="font-mono text-xs font-semibold text-[#0b0b0b] hover:text-[#9b7740] transition-colors flex items-center gap-1 text-left"
                        title="Click to view and print invoice"
                      >
                        {order.invoiceNumber}
                        <span className="text-[10px] text-[#9b7740] underline opacity-0 group-hover:opacity-100">VIEW</span>
                      </button>
                      {order.status === "RETURNED" && (
                        <span className="rounded bg-[#fef0f0] border border-[#f5c6cb] px-1.5 py-0.5 text-[9px] font-bold text-[#8a1a1a]">
                          RETURNED
                        </span>
                      )}
                      {order.status === "PARTIALLY_RETURNED" && (
                        <span className="rounded bg-[#fdf8f0] border border-[#f5d996] px-1.5 py-0.5 text-[9px] font-bold text-[#8a5a10]">
                          PARTIAL RETURN
                        </span>
                      )}
                      {order.status === "EXCHANGED" && (
                        <span className="rounded bg-[#f0f4fc] border border-[#b8ccee] px-1.5 py-0.5 text-[9px] font-bold text-[#1a3a7a]">
                          EXCHANGED
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-[#0b0b0b]">{order.customerSnapshot?.name || "Walk-in"}</p>
                    <p className="mt-0.5 text-xs text-[#7c756b]">{order.customerSnapshot?.mobile || "—"}</p>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#5f594f]">
                    <button
                      type="button"
                      onClick={() => toggleExpand(orderIdStr)}
                      className="font-medium hover:underline flex items-center gap-1"
                    >
                      <Package size={13} className="text-[#8a847a]" />
                      {totalItemsCount} item{totalItemsCount !== 1 ? 's' : ''}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-xs">
                    <p className="font-medium text-[#151515]">
                      {(order.payments || []).map((payment) => payment.method).join(" + ") || "—"}
                    </p>
                    {order.duePaisa > 0 ? (
                      <span className="mt-1 inline-flex items-center rounded bg-[#fff0f0] border border-[#f5c6cb] px-1.5 py-0.5 text-[10px] font-bold text-[#8a2f20] font-financial">
                        Due: {formatMoney(order.duePaisa)}
                      </span>
                    ) : (
                      <span className="mt-1 inline-flex items-center text-[10px] font-medium text-[#1a6b3a]">
                        Paid in full
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {message ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${message.status === "FAILED" ? "text-[#9d382c]" : "text-[#1a6b3a]"}`}>
                          <MessageCircle size={13} />{message.status}
                        </span>
                        {message.status === "FAILED" && (
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(order)}
                            disabled={sendingWaOrderId === orderIdStr}
                            className="text-[10px] text-[#9b7740] hover:underline font-semibold"
                            title="Retry WhatsApp"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    ) : order.customerSnapshot?.mobile ? (
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(order)}
                        disabled={sendingWaOrderId === orderIdStr}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9b7740] hover:text-[#7a5c2f] hover:underline"
                        title="Send invoice via WhatsApp"
                      >
                        <MessageCircle size={13} className="text-[#25D366]" />
                        {sendingWaOrderId === orderIdStr ? "Sending..." : "Send Bill"}
                      </button>
                    ) : (
                      <span className="text-xs text-[#898277]">No phone</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#655e54]">
                    {formatDate(order.completedAt)}
                  </td>
                  <td className="font-financial px-5 py-3.5 text-right font-semibold">
                    {formatMoney(order.totalPaisa)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {order.customerSnapshot?.mobile && (
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(order)}
                          disabled={sendingWaOrderId === orderIdStr}
                          className="text-[#25D366] hover:text-[#128C7E] transition-colors p-1"
                          title="Send/Share Invoice on WhatsApp"
                        >
                          {sendingWaOrderId === orderIdStr ? (
                            <Loader2 size={15} className="animate-spin text-[#9b7740]" />
                          ) : (
                            <MessageCircle size={15} />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveInvoiceOrder(order)}
                        className="text-[#9b7740] hover:text-[#5d4624] transition-colors p-1"
                        title="View & Print Luxury Invoice"
                      >
                        <Receipt size={15} />
                      </button>
                      <a
                        href={`/api/invoices/${invoice ? invoice._id : orderIdStr}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#5f584e] hover:text-[#9b7740] transition-colors p-1"
                        title="Download Official PDF"
                      >
                        <Printer size={15} />
                      </a>
                      <Link 
                        href={`/billing?editOrderId=${orderIdStr}`}
                        className="text-[#9b7740] hover:text-[#7a5c2f] transition-colors p-1"
                        title="Edit Order in POS"
                      >
                        <Pencil size={15} />
                      </Link>
                      <Link
                        href={`/returns?invoice=${encodeURIComponent(order.invoiceNumber || "")}`}
                        className="text-[#5a2a7a] hover:text-[#3a1555] transition-colors p-1"
                        title="Return or Exchange Items"
                      >
                        <RotateCcw size={15} />
                      </Link>
                      <DeleteOrderButton orderId={orderIdStr} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Expanded Order Details Modal / Drawer row */}
      {expandedOrderId && (() => {
        const expandedOrder = orders.find(o => o._id.toString() === expandedOrderId);
        if (!expandedOrder) return null;
        const invoice = invoiceByOrderId.get(expandedOrderId);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150" onClick={() => setExpandedOrderId(null)}>
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden border border-[#e8e3da] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b bg-[#faf9f6] px-6 py-4 shrink-0">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9b7740]">Order Details</p>
                  <h3 className="font-semibold text-lg text-[#0b0b0b]">Invoice #{expandedOrder.invoiceNumber}</h3>
                  <p className="text-xs text-[#706a61] mt-0.5">{formatDate(expandedOrder.completedAt)} · {expandedOrder.customerSnapshot?.name || "Walk-in"}</p>
                </div>
                <button onClick={() => setExpandedOrderId(null)} className="p-1 rounded text-[#8a847a] hover:text-[#0b0b0b] text-base">✕</button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* Items Table */}
                <div className="rounded-lg border border-[#e6e0d5] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#faf9f6] text-[#81796d] uppercase tracking-wider font-semibold border-b">
                      <tr>
                        <th className="px-4 py-2.5">Product & SKU</th>
                        <th className="px-4 py-2.5 text-center">Qty</th>
                        <th className="px-4 py-2.5 text-right">Unit Price</th>
                        <th className="px-4 py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0ede7]">
                      {(expandedOrder.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#faf9f6]">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-[#0b0b0b]">{item.productName}</p>
                            <p className="text-[11px] text-[#706a61] mt-0.5 font-mono">
                              {[item.sku, item.color, item.size].filter(Boolean).join(" · ")}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">{item.quantity}</td>
                          <td className="px-4 py-3 text-right font-financial text-[#5f584e]">
                            {formatMoney(Math.floor(item.totalPaisa / (item.quantity || 1)))}
                          </td>
                          <td className="px-4 py-3 text-right font-financial font-semibold text-[#0b0b0b]">
                            {formatMoney(item.totalPaisa)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Row */}
                <div className="bg-[#faf9f6] rounded-lg p-4 border border-[#e6e0d5] flex flex-col sm:flex-row justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <p className="font-semibold text-[#5f584e]">Customer Information</p>
                    <p className="text-[#0b0b0b] font-medium">{expandedOrder.customerSnapshot?.name || "Walk-in"}</p>
                    {expandedOrder.customerSnapshot?.mobile && (
                      <p className="text-[#706a61]">Phone: {expandedOrder.customerSnapshot.mobile}</p>
                    )}
                    {expandedOrder.customerSnapshot?.gstin && (
                      <p className="text-[#706a61] font-mono">GSTIN: {expandedOrder.customerSnapshot.gstin}</p>
                    )}
                    <p className="pt-2 text-[#706a61]">
                      Paid via: <strong className="text-[#0b0b0b]">{(expandedOrder.payments || []).map(p => `${p.method} (${formatMoney(p.amountPaisa)})`).join(", ") || "None"}</strong>
                    </p>
                  </div>

                  <div className="space-y-1 sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-[#dfd8cc]">
                    {expandedOrder.discountPaisa > 0 && (
                      <p className="text-[#7a5c20]">
                        Discount: −{formatMoney(expandedOrder.discountPaisa)}
                      </p>
                    )}
                    <p className="text-sm font-bold text-[#0b0b0b]">
                      Grand Total: <span className="font-financial text-[#1a6b3a] text-base">{formatMoney(expandedOrder.totalPaisa)}</span>
                    </p>
                    {expandedOrder.duePaisa > 0 && (
                      <p className="text-xs text-[#a53a2d] font-bold">
                        Balance Due: {formatMoney(expandedOrder.duePaisa)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center px-6 py-4 bg-[#faf9f6] border-t border-[#dfd8cc] gap-3 shrink-0">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveInvoiceOrder(expandedOrder)}
                    className="bg-[#fffdf9] border-[#c9963e] text-[#9b7740] hover:bg-[#fff9ed] font-semibold text-xs flex items-center gap-1.5"
                  >
                    <Receipt size={14} /> View & Print Invoice
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`/api/invoices/${invoice ? invoice._id : expandedOrderId}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FileText size={14} className="mr-1.5" /> Direct PDF
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="border-[#d0bce0] text-[#5a2a7a] hover:bg-[#faf4fc]">
                    <Link href={`/returns?invoice=${encodeURIComponent(expandedOrder.invoiceNumber || "")}`}>
                      <RotateCcw size={14} className="mr-1.5" /> Return / Exchange
                    </Link>
                  </Button>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="gold" size="sm" asChild>
                    <Link href={`/billing?editOrderId=${expandedOrderId}`}>
                      Edit Order in POS
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setExpandedOrderId(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[#dfd8cc] px-6 py-4 bg-[#faf9f6] gap-3">
          <p className="text-xs text-[#706a61]">
            Showing page <strong className="text-[#0b0b0b]">{page}</strong> of <strong className="text-[#0b0b0b]">{totalPages}</strong> ({total} total orders)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              asChild={page > 1}
              className="h-8 text-xs"
            >
              {page > 1 ? (
                <Link href={`/orders?page=${page - 1}${currentQuery ? `&q=${encodeURIComponent(currentQuery)}` : ""}${startDate ? `&startDate=${encodeURIComponent(startDate)}` : ""}${endDate ? `&endDate=${encodeURIComponent(endDate)}` : ""}`}>
                  <ArrowLeft size={13} className="mr-1" /> Previous
                </Link>
              ) : (
                <span><ArrowLeft size={13} className="mr-1 inline" /> Previous</span>
              )}
            </Button>

            <span className="text-xs font-semibold px-2 text-[#5f584e]">
              {page} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              asChild={page < totalPages}
              className="h-8 text-xs"
            >
              {page < totalPages ? (
                <Link href={`/orders?page=${page + 1}${currentQuery ? `&q=${encodeURIComponent(currentQuery)}` : ""}${startDate ? `&startDate=${encodeURIComponent(startDate)}` : ""}${endDate ? `&endDate=${encodeURIComponent(endDate)}` : ""}`}>
                  Next <ArrowRight size={13} className="ml-1" />
                </Link>
              ) : (
                <span>Next <ArrowRight size={13} className="ml-1 inline" /></span>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={!!activeInvoiceOrder}
        onClose={() => setActiveInvoiceOrder(null)}
        order={activeInvoiceOrder}
      />
    </div>
  );
}
