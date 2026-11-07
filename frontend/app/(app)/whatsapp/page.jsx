"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MessageCircle,
  RefreshCcw,
  AlertTriangle,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  ExternalLink,
  Users,
  Search,
  HandCoins,
  ShieldCheck,
  Receipt,
} from "lucide-react";
import { formatDate, formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/src/services/api";
import { toast } from "sonner";
import Link from "next/link";

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState("logs"); // "logs" | "compose"
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Compose State
  const [composeType, setComposeType] = useState("REMINDER"); // "REMINDER" | "INVOICE" | "CUSTOM"
  const [customersWithDues, setCustomersWithDues] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [dueAmount, setDueAmount] = useState(0);
  const [customMessage, setCustomMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [storeSettings, setStoreSettings] = useState(null);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await api.whatsapp.getMessages();
      setMessages(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const [custRes, settRes] = await Promise.allSettled([
        api.customers.getAll(),
        api.settings.get(),
      ]);
      if (custRes.status === "fulfilled") {
        const custs = custRes.value?.customers || [];
        setCustomersWithDues(custs.filter((c) => (c.stats?.totalDuesPaisa || 0) > 0));
      }
      if (settRes.status === "fulfilled" && settRes.value?.settings) {
        setStoreSettings(settRes.value.settings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchCustomers();
  }, []);

  const handleRetry = async (id) => {
    setRetryingId(id);
    try {
      await api.whatsapp.retry(id);
      toast.success("Retry request queued successfully");
      setTimeout(fetchMessages, 2000);
    } catch (err) {
      toast.error(err.message || "Failed to retry message");
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "SENT":
        return "bg-[#f0f9f4] text-[#1a6b3a]";
      case "FAILED":
        return "bg-[#fef0f0] text-[#8a1a1a]";
      case "QUEUED":
        return "bg-[#fdf8f0] text-[#8a5a10]";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Compute stats
  const stats = useMemo(
    () => ({
      total: messages.length,
      sent: messages.filter((m) => m.status === "SENT").length,
      failed: messages.filter((m) => m.status === "FAILED").length,
      queued: messages.filter((m) => m.status === "QUEUED").length,
    }),
    [messages]
  );

  const filteredMessages = useMemo(() => {
    if (filterStatus === "ALL") return messages;
    return messages.filter((m) => m.status === filterStatus);
  }, [messages, filterStatus]);

  // Handle selecting a customer for reminder
  const handleSelectCustomer = (custId) => {
    setSelectedCustomerId(custId);
    const found = customersWithDues.find((c) => c._id === custId);
    if (found) {
      setRecipientName(found.name || "Customer");
      setRecipientPhone(found.whatsappNumber || found.mobile || "");
      setDueAmount(found.stats?.totalDuesPaisa || 0);
    } else {
      setRecipientName("");
      setRecipientPhone("");
      setDueAmount(0);
    }
  };

  // Generated message text
  const previewText = useMemo(() => {
    const store = storeSettings?.storeName || "Fashion Hub";
    const upi = storeSettings?.upiId ? `\nUPI Payment ID: ${storeSettings.upiId}` : "";
    if (composeType === "REMINDER") {
      const name = recipientName || "Valued Customer";
      const amtStr = formatMoney(dueAmount);
      return `Dear ${name},\n\nGreetings from ${store}! This is a gentle reminder regarding your outstanding bill balance of ${amtStr}.${upi}\n\nYou can pay directly via UPI or visit our store. Thank you for your continued patronship!`;
    }
    if (composeType === "INVOICE") {
      const name = recipientName || "Valued Customer";
      return `Dear ${name},\n\nThank you for shopping at ${store}! Your electronic tax bill has been generated and is available for your records.\n\nWarm regards,\n${store}`;
    }
    return customMessage || `Hello from ${store}! We appreciate your visit.`;
  }, [composeType, recipientName, dueAmount, storeSettings, customMessage]);

  const handleSendMessage = async (openWhatsAppWebDirect = false) => {
    const cleanNumber = recipientPhone.replace(/\D/g, "");
    if (!cleanNumber || cleanNumber.length < 10) {
      toast.warning("Please provide a valid 10-digit mobile number.");
      return;
    }

    const waPhone = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
    const waWebUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(previewText)}`;

    if (openWhatsAppWebDirect) {
      window.open(waWebUrl, "_blank");
      toast.info("Opening WhatsApp chat directly");
      return;
    }

    setSendingMessage(true);
    try {
      const res = await api.whatsapp.sendCustom({
        customerId: selectedCustomerId || undefined,
        phoneNumber: cleanNumber,
        messageText: previewText,
        type: composeType === "REMINDER" ? "REMINDER" : "CUSTOM",
      });

      toast.success(res.message || "WhatsApp message logged and queued!");
      fetchMessages();
      // Also open WhatsApp Web as convenient fallback
      if (res.data?.waWebUrl) {
        window.open(res.data.waWebUrl, "_blank");
      }
    } catch (err) {
      toast.error(err.message || "Failed to send message via Cloud API");
      // Fallback: open WhatsApp web directly
      window.open(waWebUrl, "_blank");
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="space-y-7 pb-10">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#dfd8cc] pb-6 gap-4">
        <div>
          <p className="eyebrow flex items-center gap-2" style={{ color: "#1a3a7a" }}>
            <span style={{ width: 16, height: 1, background: "#1a3a7a", display: "inline-block" }} />
            Customer Communications
          </p>
          <h2 className="page-headline mt-2 text-2xl sm:text-3xl md:text-4xl">
            WhatsApp Center
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#756e64]">
            Automated invoice delivery, dues payment reminders, and direct WhatsApp customer outreach.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchMessages}
            disabled={loading}
            className="w-full sm:w-auto justify-center h-9 text-xs"
          >
            <RefreshCcw size={14} className={`mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex items-center gap-6 border-b border-[#dfd8cc]">
        <button
          onClick={() => setActiveTab("logs")}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "logs"
              ? "border-[#0b0b0b] text-[#0b0b0b]"
              : "border-transparent text-[#81796d] hover:text-[#0b0b0b]"
          }`}
        >
          <Clock size={16} /> Delivery Logs ({messages.length})
        </button>
        <button
          onClick={() => setActiveTab("compose")}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "compose"
              ? "border-[#0b0b0b] text-[#0b0b0b]"
              : "border-transparent text-[#81796d] hover:text-[#0b0b0b]"
          }`}
        >
          <Send size={16} /> Send Message &amp; Dues Reminders
        </button>
      </div>

      {/* ── TAB 1: LOGS & STATS ── */}
      {activeTab === "logs" && (
        <div className="space-y-6">
          <div className="rounded-md border border-[#e0ae9f] bg-[#fff0ec] px-5 py-4 text-[#8a2f20] flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0" />
            <div className="text-sm">
              <strong>WhatsApp Cloud API Status:</strong>
              <p className="mt-1 opacity-90 text-xs sm:text-sm">
                In addition to Meta Cloud API delivery, you can also send reminders and bills directly to customers
                via the WhatsApp Web / Desktop chat link with one click.
              </p>
            </div>
          </div>

          {/* Stats Summary */}
          {messages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Dispatched", count: stats.total, icon: MessageCircle, color: "#1a3a7a" },
                { label: "Delivered", count: stats.sent, icon: CheckCircle2, color: "#1a6b3a" },
                { label: "Failed", count: stats.failed, icon: XCircle, color: "#8a1a1a" },
                { label: "Queued", count: stats.queued, icon: Clock, color: "#8a5a10" },
              ].map(({ label, count, icon: Icon, color }) => (
                <div
                  key={label}
                  className="rounded-md border bg-white p-4 shadow-sm"
                  style={{ borderLeft: `3px solid ${color}` }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
                      {label}
                    </p>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <p className="mt-2 text-2xl font-bold font-financial" style={{ color }}>
                    {count}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-md border bg-white overflow-hidden flex flex-col min-h-[420px]">
            <div className="border-b px-5 py-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold text-sm">Delivery Log</h3>
              {messages.length > 0 && (
                <div className="inline-flex rounded-md border border-[#dfd8cc] p-0.5 bg-white text-xs gap-0.5">
                  {["ALL", "SENT", "FAILED", "QUEUED"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFilterStatus(s)}
                      className={`px-2.5 py-1 rounded font-medium transition-colors ${
                        filterStatus === s
                          ? s === "SENT"
                            ? "bg-[#1a6b3a] text-white"
                            : s === "FAILED"
                            ? "bg-[#8a1a1a] text-white"
                            : s === "QUEUED"
                            ? "bg-[#8a5a10] text-white"
                            : "bg-[#0b0b0b] text-white"
                          : "text-[#706a61] hover:text-[#0b0b0b]"
                      }`}
                    >
                      {s} {s !== "ALL" && `(${stats[s.toLowerCase()]})`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-x-auto">
              {loading && messages.length === 0 ? (
                <div className="p-10 text-center text-sm text-gray-500">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="grid place-items-center p-20 text-center text-[#706a61]">
                  <MessageCircle size={32} className="mb-3 text-[#c9963e]" />
                  <p className="font-semibold">No messages yet</p>
                  <p className="text-sm mt-1">Send bills or dues reminders to your customers via WhatsApp.</p>
                  <Button variant="gold" className="mt-4" onClick={() => setActiveTab("compose")}>
                    Send First Reminder
                  </Button>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#706a61]">
                  No messages with status &quot;{filterStatus}&quot;.
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-[#81796d]">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Phone Number</th>
                      <th className="px-5 py-3 font-semibold">Type</th>
                      <th className="px-5 py-3 font-semibold">Invoice / Note</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Timestamp</th>
                      <th className="px-5 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredMessages.map((msg) => (
                      <tr key={msg._id} className="hover:bg-[#faf9f6]">
                        <td className="px-5 py-3.5 font-medium">{msg.phoneNumber}</td>
                        <td className="px-5 py-3.5 text-xs text-[#5f584e]">
                          <span className="rounded bg-[#f0ede7] px-2 py-0.5 text-[10px] font-semibold">
                            {msg.type || "INVOICE"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {msg.invoiceId ? (
                            <a
                              href={api.invoices.getPdfUrl(msg.invoiceId)}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 text-xs font-semibold text-[#1a3a7a] hover:underline"
                            >
                              <FileText size={14} /> View Invoice
                            </a>
                          ) : (
                            <span className="text-xs text-[#706a61] truncate max-w-[200px] block" title={msg.messageBody}>
                              {msg.messageBody || "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex rounded-sm px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${getStatusStyle(
                              msg.status
                            )}`}
                          >
                            {msg.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#706a61]">
                          {formatDate(msg.updatedAt || msg.createdAt)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {msg.status !== "SENT" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[10px]"
                                disabled={retryingId === msg._id}
                                onClick={() => handleRetry(msg._id)}
                              >
                                {retryingId === msg._id ? "..." : "Retry API"}
                              </Button>
                            )}
                            <a
                              href={`https://wa.me/${msg.phoneNumber.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#25D366] hover:text-[#128C7E] p-1 text-xs inline-flex items-center gap-1"
                              title="Open direct WhatsApp Web chat"
                            >
                              <ExternalLink size={13} /> Chat
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: COMPOSE & REMINDERS ── */}
      {activeTab === "compose" && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Left: Compose Form */}
          <div className="rounded-md border bg-white p-6 shadow-sm space-y-5">
            <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
              <MessageCircle size={18} className="text-[#25D366]" />
              Compose Message / Reminder
            </h3>

            {/* Template Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                Message Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "REMINDER", label: "Dues Reminder", icon: HandCoins },
                  { id: "INVOICE", label: "Bill Receipt", icon: Receipt },
                  { id: "CUSTOM", label: "Custom Message", icon: MessageCircle },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setComposeType(t.id)}
                      className={`p-3 rounded-md border text-center transition-all ${
                        composeType === t.id
                          ? "border-[#c9963e] bg-[#fffcf5] text-[#8a5a10] font-semibold ring-1 ring-[#c9963e]"
                          : "border-[#dfd8cc] bg-white text-[#5f584e] hover:bg-[#faf9f6]"
                      }`}
                    >
                      <Icon size={16} className="mx-auto mb-1 text-[#c9963e]" />
                      <p className="text-xs">{t.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* If Dues Reminder: Select customer with dues */}
            {composeType === "REMINDER" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                  Select Customer with Dues ({customersWithDues.length} with dues)
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="w-full h-9 rounded-md border bg-white px-3 text-xs outline-none focus:border-[#c9963e]"
                >
                  <option value="">-- Choose Customer or Enter Below --</option>
                  {customersWithDues.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.mobile || "No phone"}) — Dues: {formatMoney(c.stats?.totalDuesPaisa || 0)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Recipient Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                  Recipient Name
                </label>
                <Input
                  className="h-9 text-xs"
                  placeholder="e.g. Rahul Sharma"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                  WhatsApp Mobile *
                </label>
                <Input
                  className="h-9 text-xs font-mono"
                  placeholder="e.g. 9876543210"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                />
              </div>
            </div>

            {composeType === "REMINDER" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                  Pending Balance (₹)
                </label>
                <Input
                  type="number"
                  className="h-9 text-xs font-financial"
                  placeholder="e.g. 1500"
                  value={dueAmount ? dueAmount / 100 : ""}
                  onChange={(e) => setDueAmount(Math.round(parseFloat(e.target.value || 0) * 100))}
                />
              </div>
            )}

            {composeType === "CUSTOM" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                  Custom Text
                </label>
                <textarea
                  className="w-full rounded-md border border-[#dfd8cc] p-3 text-xs outline-none focus:border-[#c9963e] focus:ring-1 focus:ring-[#c9963e]"
                  rows={4}
                  placeholder="Type your message to the customer..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2.5 pt-3 border-t">
              <Button
                variant="gold"
                onClick={() => handleSendMessage(false)}
                disabled={sendingMessage || !recipientPhone}
                className="flex-1 text-xs h-9 font-semibold"
              >
                <Send size={14} className="mr-1.5" />
                {sendingMessage ? "Queuing..." : "Queue Cloud Message"}
              </Button>

              <Button
                variant="outline"
                onClick={() => handleSendMessage(true)}
                disabled={!recipientPhone}
                className="flex-1 text-xs h-9 border-[#25D366]/50 text-[#128C7E] hover:bg-[#25D366]/10 font-semibold"
              >
                <MessageCircle size={14} className="mr-1.5 text-[#25D366]" />
                Open WhatsApp Web Chat
              </Button>
            </div>
          </div>

          {/* Right: Message Live Preview */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
              Message Live Preview
            </h4>
            <div className="rounded-2xl border border-[#d8d3c8] bg-[#eae6df] p-4 shadow-md max-w-sm mx-auto">
              {/* WhatsApp Chat Bubble */}
              <div className="rounded-xl bg-[#dcf8c6] p-3.5 text-xs text-[#0b0b0b] shadow-xs relative space-y-2 whitespace-pre-wrap leading-relaxed font-sans">
                <p>{previewText}</p>
                <div className="flex items-center justify-end gap-1 text-[10px] text-[#707070] pt-1">
                  <span>Just now</span>
                  <CheckCircle2 size={11} className="text-[#34b7f1]" />
                </div>
              </div>
              <p className="mt-2 text-[10px] text-center text-[#8a847a]">
                Directly sent to {recipientPhone || "+91 XXXXX XXXXX"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
