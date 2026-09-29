"use client";

import { useState, useEffect } from "react";
import { MessageCircle, RefreshCcw, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { apiBase } from "@/lib/backend";
import { Button } from "@/components/ui/button";
import { api } from "@/src/services/api";
import Link from "next/link";

export default function WhatsAppPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);

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

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleRetry = async (id) => {
    setRetryingId(id);
    try {
      await api.whatsapp.retry(id);
      // Wait a moment before refreshing to give the queue a chance
      setTimeout(fetchMessages, 2000);
    } catch (err) {
      alert(err.message || "Failed to retry message");
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "SENT": return "bg-[#f0f9f4] text-[#1a6b3a]";
      case "FAILED": return "bg-[#fef0f0] text-[#8a1a1a]";
      case "QUEUED": return "bg-[#fdf8f0] text-[#8a5a10]";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-7 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#dfd8cc] pb-6 gap-4">
        <div>
          <p className="eyebrow flex items-center gap-2" style={{ color: '#1a3a7a' }}>
            <span style={{ width: 16, height: 1, background: '#1a3a7a', display: 'inline-block' }} />
            Customer Communications
          </p>
          <h2 className="page-headline mt-2 text-2xl sm:text-3xl md:text-4xl">
            WhatsApp Invoices
          </h2>
        </div>
        <Button variant="outline" onClick={fetchMessages} disabled={loading} className="w-full sm:w-auto justify-center">
          <RefreshCcw size={16} className={`mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-md border border-[#e0ae9f] bg-[#fff0ec] px-5 py-4 text-[#8a2f20] flex items-start gap-3">
        <AlertTriangle size={20} className="mt-0.5" />
        <div className="text-sm">
          <strong>Configuration Required:</strong> 
          <p className="mt-1 opacity-90">
            Messages will remain stuck in "QUEUED" or "FAILED" until you add your Meta WhatsApp Business credentials to the backend <code className="bg-[#fce8e6] px-1 rounded">.env</code> file. 
            You need <code>WHATSAPP_ACCESS_TOKEN</code> and <code>WHATSAPP_PHONE_NUMBER_ID</code>.
          </p>
        </div>
      </div>

      <div className="rounded-md border bg-white overflow-hidden flex flex-col min-h-[500px]">
        <div className="border-b px-5 py-4">
          <h3 className="font-semibold text-sm">Delivery Log</h3>
        </div>
        
        <div className="flex-1 overflow-x-auto">
          {loading && messages.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="grid place-items-center p-20 text-center text-[#706a61]">
              <MessageCircle size={32} className="mb-3 text-[#c9963e]" />
              <p className="font-semibold">No messages yet</p>
              <p className="text-sm mt-1">Opt a customer into WhatsApp billing during checkout.</p>
              <Button variant="gold" className="mt-4" asChild>
                <Link href="/billing">Go to Billing</Link>
              </Button>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-[#81796d]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Phone Number</th>
                  <th className="px-5 py-3 font-semibold">Invoice</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Timestamp</th>
                  <th className="px-5 py-3 font-semibold">Error Log</th>
                  <th className="px-5 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {messages.map(msg => (
                  <tr key={msg._id} className="hover:bg-[#faf9f6]">
                    <td className="px-5 py-3.5 font-medium">{msg.phoneNumber}</td>
                    <td className="px-5 py-3.5">
                      <a 
                        href={`${apiBase()}/invoices/${msg.invoiceId}/pdf`}
                        target="_blank"
                        className="flex items-center gap-1.5 text-xs font-semibold hover:text-[#9b7740]"
                      >
                        <FileText size={14} /> PDF
                      </a>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-sm px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${getStatusStyle(msg.status)}`}>
                        {msg.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#706a61]">
                      {formatDate(msg.updatedAt)}
                    </td>
                    <td className="px-5 py-3.5 text-[11px] text-[#d93025] max-w-[200px] truncate" title={msg.lastError}>
                      {msg.lastError || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {msg.status !== "SENT" ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 px-2 text-[10px]"
                          disabled={retryingId === msg._id}
                          onClick={() => handleRetry(msg._id)}
                        >
                          {retryingId === msg._id ? "Retrying..." : "Retry"}
                        </Button>
                      ) : (
                        <CheckCircle2 size={16} className="text-[#1e8e3e] ml-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
