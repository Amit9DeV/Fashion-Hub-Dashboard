"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Printer, Receipt, Pencil, RotateCcw, MessageCircle, Loader2 } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/utils";
import InvoiceModal from "@/components/invoice/InvoiceModal";
import { api } from "@/src/services/api";
import { toast } from "sonner";

export default function CustomerOrderHistoryTable({ orders = [], customer = null }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [sendingWaOrderId, setSendingWaOrderId] = useState(null);

  const handleSendWhatsApp = async (order) => {
    const phone = order.customerSnapshot?.mobile || customer?.mobile || customer?.whatsappNumber;
    if (!phone) {
      toast.error("Customer does not have a registered mobile number");
      return;
    }
    const orderIdStr = order._id.toString();
    setSendingWaOrderId(orderIdStr);
    try {
      const res = await api.whatsapp.send({ orderId: orderIdStr });
      if (res.success) {
        toast.success(res.message || "WhatsApp invoice sent!");
      } else {
        throw new Error(res.message || "Failed to send");
      }
    } catch {
      const cleanDigits = phone.replace(/\D/g, "");
      const waNumber = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
      const msg = encodeURIComponent(`Hello ${customer?.name || order.customerSnapshot?.name || "Customer"}, here is your bill for Invoice #${order.invoiceNumber} totaling ₹${((order.totalPaisa || 0) / 100).toFixed(2)} from Fashion Hub.`);
      window.open(`https://wa.me/${waNumber}?text=${msg}`, "_blank");
      toast.info("Opening WhatsApp Web directly");
    } finally {
      setSendingWaOrderId(null);
    }
  };

  if (!orders.length) {
    return (
      <div className="p-8 text-center text-sm text-[#706a61]">
        No orders found for this customer.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-[#81796d]">
            <tr>
              <th className="px-5 py-3 font-semibold">Invoice</th>
              <th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-5 py-3 font-semibold">Items</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold text-right">Total</th>
              <th className="px-5 py-3 font-semibold text-right">Due</th>
              <th className="px-5 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const orderIdStr = order._id.toString();
              const isPaid = !order.duePaisa || order.duePaisa === 0;
              const totalItems = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

              return (
                <tr key={orderIdStr} className="border-t hover:bg-[#faf9f6]">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-[#9b7740]" />
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="font-mono text-xs font-semibold text-[#0b0b0b] hover:text-[#9b7740] hover:underline"
                        title="Click to view and print invoice"
                      >
                        {order.invoiceNumber}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#5f584e]">{formatDate(order.completedAt)}</td>
                  <td className="px-5 py-3.5 text-xs">
                    {totalItems} item{totalItems !== 1 ? 's' : ''}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                        isPaid
                          ? "bg-[#eaf5ed] text-[#1a6b3a]"
                          : order.duePaisa < order.totalPaisa
                          ? "bg-[#fff3cd] text-[#856404]"
                          : "bg-[#f8d7da] text-[#721c24]"
                      }`}
                    >
                      {isPaid ? "PAID" : order.duePaisa < order.totalPaisa ? "PARTIAL" : "UNPAID"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold font-financial">
                    {formatMoney(order.totalPaisa)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold font-financial">
                    {order.duePaisa > 0 ? (
                      <span className="text-[#8a2f20] font-bold">{formatMoney(order.duePaisa)}</span>
                    ) : (
                      <span className="text-[#a09a8f] font-normal">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {(order.customerSnapshot?.mobile || customer?.mobile || customer?.whatsappNumber) && (
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(order)}
                          disabled={sendingWaOrderId === orderIdStr}
                          className="text-[#25D366] hover:text-[#128C7E] transition-colors p-1"
                          title="Send Invoice on WhatsApp"
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
                        onClick={() => setSelectedOrder(order)}
                        className="text-[#9b7740] hover:text-[#5d4624] transition-colors p-1"
                        title="View & Print Invoice"
                      >
                        <Receipt size={15} />
                      </button>
                      <a
                        href={`/api/invoices/${orderIdStr}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#5f584e] hover:text-[#9b7740] transition-colors p-1"
                        title="Download PDF"
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
                        title="Return or Exchange"
                      >
                        <RotateCcw size={15} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <InvoiceModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
      />
    </>
  );
}

