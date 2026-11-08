"use client";

import React, { useState, useEffect } from "react";
import { Printer, Download, MessageCircle, X, Loader2, Send, Sun, Moon, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/src/services/api";
import { toast } from "sonner";
import FashionHubInvoice from "./FashionHubInvoice";
import ThermalReceipt from "./ThermalReceipt";

export default function InvoiceModal({
  isOpen,
  onClose,
  order = null,
  orderId = null,
  invoiceId = null,
  defaultFormat = null,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showWhatsappInput, setShowWhatsappInput] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [printTheme, setPrintTheme] = useState("dark");
  const [printFormat, setPrintFormat] = useState("A4"); // "A4" | "THERMAL"
  const [storeSettings, setStoreSettings] = useState(null);

  useEffect(() => {
    api.settings.get().then((res) => {
      if (res?.settings) {
        setStoreSettings(res.settings);
        if (!defaultFormat && res.settings.printFormat === "THERMAL_80MM") {
          setPrintFormat("THERMAL");
        }
      }
    }).catch(() => {});
  }, [defaultFormat, isOpen]);

  useEffect(() => {
    if (isOpen && printFormat === "THERMAL") {
      document.body.classList.add("print-thermal");
    } else {
      document.body.classList.remove("print-thermal");
    }
    return () => {
      document.body.classList.remove("print-thermal");
    };
  }, [isOpen, printFormat]);

  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setShowWhatsappInput(false);
      return;
    }

    // If order or invoice object is already passed, use it immediately
    if (order) {
      const cust = order.customerSnapshot || order.customer || null;
      setData({
        invoice: order,
        customer: cust,
        store: null,
      });
      setWhatsappPhone(cust?.whatsappNumber || cust?.mobile || "");
      return;
    }

    // Otherwise fetch from API by ID
    const targetId = invoiceId || orderId;
    if (!targetId) return;

    setLoading(true);
    api.invoices.getById(targetId)
      .then((res) => {
        const payload = res.data || res;
        setData(payload);
        const mobile = payload.customer?.whatsappNumber || payload.customer?.mobile || "";
        setWhatsappPhone(mobile);
      })
      .catch(async () => {
        // Fallback: try orders API
        try {
          const ordRes = await api.orders.getById(targetId);
          const ord = ordRes.order || ordRes;
          const cust = ordRes.customer || ord.customerSnapshot || null;
          setData({
            invoice: ord,
            customer: cust,
            store: null,
          });
          setWhatsappPhone(cust?.whatsappNumber || cust?.mobile || "");
        } catch (err) {
          toast.error("Could not load invoice: " + (err.message || "Not found"));
          onClose();
        }
      })
      .finally(() => setLoading(false));
  }, [isOpen, order, orderId, invoiceId, onClose]);

  if (!isOpen) return null;

  const currentOrderId = order?._id || orderId || data?.invoice?.orderId || data?.invoice?._id;
  const currentInvoiceId = invoiceId || data?.invoice?._id || currentOrderId;
  const pdfDownloadUrl = `/api/invoices/${currentInvoiceId}/pdf`;

  const handleSendWhatsapp = async (e) => {
    e.preventDefault();
    if (!whatsappPhone.trim()) {
      toast.warning("Please enter a valid mobile number.");
      return;
    }

    setSendingWhatsapp(true);
    try {
      await api.whatsapp.send({
        orderId: currentOrderId,
        invoiceId: currentInvoiceId,
        phoneNumber: whatsappPhone.trim(),
      });
      toast.success(`Invoice sent via WhatsApp to ${whatsappPhone}!`);
      setShowWhatsappInput(false);
    } catch (err) {
      toast.error(err.message || "Failed to send WhatsApp invoice");
    } finally {
      setSendingWhatsapp(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[850px] bg-[#141414] border border-[#2e2a25] rounded-xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Controls Toolbar (Hidden in Print) */}
        <div className="no-print bg-[#0b0b0b] border-b border-[#262420] px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[#C99532] text-xs font-serif tracking-[0.2em] uppercase font-bold">
              Fashion Hub
            </span>
            <span className="text-[#666] text-xs">/</span>
            <span className="text-white text-xs font-mono font-medium">
              {data?.invoice?.invoiceNumber || order?.invoiceNumber || "Invoice"}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Format Toggle (A4 vs Thermal) */}
            <div className="inline-flex rounded-md border border-[#38332a] p-0.5 bg-[#1f1d1a] text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat("A4")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  printFormat === "A4"
                    ? "bg-[#C99532] text-black"
                    : "text-[#9c9489] hover:text-white"
                }`}
              >
                A4 Luxury
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat("THERMAL")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                  printFormat === "THERMAL"
                    ? "bg-[#C99532] text-black"
                    : "text-[#9c9489] hover:text-white"
                }`}
              >
                <Receipt size={11} /> 80mm Slip
              </button>
            </div>

            {/* Theme Toggle Button (Only for A4) */}
            {printFormat === "A4" && (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setPrintTheme((t) => (t === "dark" ? "light" : "dark"))}
                className="h-8 px-2.5 text-xs bg-[#1f1d1a] text-[#d4af37] hover:bg-[#2c2924] border-[#38332a] font-medium flex items-center gap-1.5"
                title={printTheme === "dark" ? "Switch to Eco Paper Light Theme (Saves printer ink)" : "Switch to Luxury Dark Theme"}
              >
                {printTheme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
                <span>{printTheme === "dark" ? "Eco Light" : "Luxury Dark"}</span>
              </Button>
            )}

            {/* Print Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="h-8 px-3 text-xs bg-white text-black hover:bg-gray-100 border-none font-semibold flex items-center gap-1.5"
            >
              <Printer size={14} /> Print
            </Button>

            {/* Download PDF Button */}
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 px-3 text-xs bg-[#1f1d1a] text-[#e8e0d5] hover:bg-[#2c2924] border-[#38332a] font-semibold flex items-center gap-1.5"
            >
              <a href={pdfDownloadUrl} target="_blank" rel="noreferrer" download>
                <Download size={14} /> PDF
              </a>
            </Button>

            {/* Send WhatsApp Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWhatsappInput((prev) => !prev)}
              className="h-8 px-3 text-xs bg-[#155724] text-white hover:bg-[#11461d] border-none font-semibold flex items-center gap-1.5"
            >
              <MessageCircle size={14} /> WhatsApp
            </Button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="rounded p-1 text-[#9c9489] hover:text-white hover:bg-[#222] transition-colors ml-1"
              aria-label="Close invoice preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* WhatsApp Phone Prompt Popover (no-print) */}
        {showWhatsappInput && (
          <form
            onSubmit={handleSendWhatsapp}
            className="no-print bg-[#1a2e1d] border-b border-[#2d5934] px-4 py-2.5 sm:px-6 flex flex-wrap items-center gap-3 shrink-0 animate-in slide-in-from-top-2"
          >
            <span className="text-xs text-[#a2e2af] font-medium flex items-center gap-1.5">
              <MessageCircle size={14} /> Send PDF invoice to phone:
            </span>
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <Input
                type="text"
                placeholder="10-digit mobile number"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                className="h-8 text-xs bg-[#0f1f12] text-white border-[#2d5934] placeholder:text-[#527d58]"
                autoFocus
              />
              <Button
                type="submit"
                size="sm"
                disabled={sendingWhatsapp}
                className="h-8 px-3 text-xs bg-[#25d366] hover:bg-[#1ebc59] text-black font-bold shrink-0"
              >
                {sendingWhatsapp ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span className="ml-1">Send</span>
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setShowWhatsappInput(false)}
              className="text-xs text-[#8ab894] hover:text-white"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#181818] flex justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-[#8a847a]">
              <Loader2 size={32} className="animate-spin text-[#C99532] mb-3" />
              <p className="text-sm">Generating luxury invoice...</p>
            </div>
          ) : data ? (
            <div className="max-w-full overflow-x-auto pb-4">
              {printFormat === "THERMAL" ? (
                <div className="bg-white p-3 rounded-lg shadow-xl inline-block text-left">
                  <ThermalReceipt
                    invoice={data.invoice || data.snapshot}
                    customer={data.customer}
                    store={data.store || storeSettings}
                  />
                </div>
              ) : (
                <FashionHubInvoice
                  invoice={data.invoice || data.snapshot}
                  customer={data.customer}
                  store={data.store || storeSettings}
                  theme={printTheme}
                />
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-[#8a847a] text-sm">
              Unable to load invoice information.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

