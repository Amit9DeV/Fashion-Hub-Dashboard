"use client";

import { useState, useEffect } from "react";
import { Search, RotateCcw, Package, FileText, ArrowLeft, ArrowRight } from "lucide-react";
import { formatMoney, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/src/services/api";

export default function ReturnsPage() {
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Return workflow state
  const [returnItems, setReturnItems] = useState({}); // { variantId: quantityToReturn }
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // History state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await api.returns.getAll();
      setHistory(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setError("");
    setOrder(null);
    setReturnItems({});
    setReason("");

    try {
      // Find order by exact invoice number or id. 
      // The orders API expects to just fetch all for now, so we filter client side for MVP, 
      // but ideally we need an endpoint. Let's just fetch all and find it since it's an MVP,
      // or we can use a new search endpoint. We already have /orders
      const data = await api.orders.getAll();
      const found = (data.orders || []).find(o => 
        o.invoiceNumber.toLowerCase() === query.toLowerCase() || 
        o.orderNumber.toLowerCase() === query.toLowerCase() ||
        o._id === query
      );

      if (!found) {
        setError("Order not found with that Invoice or Order Number.");
      } else {
        // Also check if this order already has items returned? 
        // For a robust system we'd check previous returns.
        setOrder(found);
      }
    } catch (err) {
      setError("Failed to fetch order.");
    } finally {
      setLoading(false);
    }
  };

  const incrementReturn = (variantId, maxQty) => {
    const current = returnItems[variantId] || 0;
    if (current < maxQty) {
      setReturnItems({ ...returnItems, [variantId]: current + 1 });
    }
  };

  const decrementReturn = (variantId) => {
    const current = returnItems[variantId] || 0;
    if (current > 0) {
      setReturnItems({ ...returnItems, [variantId]: current - 1 });
    }
  };

  const calculateTotalRefund = () => {
    if (!order) return 0;
    let total = 0;
    Object.entries(returnItems).forEach(([variantId, qty]) => {
      const item = order.items.find(i => i.variantId === variantId);
      if (item && qty > 0) {
        const unitPrice = Math.floor(item.totalPaisa / item.quantity);
        total += unitPrice * qty;
      }
    });
    return total;
  };

  const submitReturn = async () => {
    const itemsToReturn = Object.entries(returnItems)
      .filter(([_, qty]) => qty > 0)
      .map(([variantId, quantity]) => ({ variantId, quantity }));

    if (itemsToReturn.length === 0) {
      alert("Select at least one item to return.");
      return;
    }

    setProcessing(true);
    try {
      await api.returns.process({
        orderId: order._id,
        reason,
        items: itemsToReturn
      });
      alert("Return processed successfully!");
      setOrder(null);
      setReturnItems({});
      setQuery("");
      fetchHistory();
    } catch (err) {
      alert(err.message || "Failed to process return.");
    } finally {
      setProcessing(false);
    }
  };

  const totalRefund = calculateTotalRefund();
  const hasItemsSelected = totalRefund > 0;

  return (
    <div className="space-y-7 pb-10">
      <div className="border-b border-[#dfd8cc] pb-6">
        <p className="eyebrow flex items-center gap-2" style={{ color: '#5a2a7a' }}>
          <span style={{ width: 16, height: 1, background: '#5a2a7a', display: 'inline-block' }} />
          Reverse Logistics
        </p>
        <h2 className="page-headline" style={{ marginTop: 10, fontSize: 36 }}>
          Returns & Exchanges
        </h2>
      </div>

      <div className="grid gap-7 lg:grid-cols-2">
        {/* Left Col: Search & Process */}
        <div className="space-y-6">
          <div className="rounded-md border bg-white p-5">
            <h3 className="font-semibold text-sm">Find Order</h3>
            <form onSubmit={handleSearch} className="mt-4 flex gap-3">
              <Input 
                placeholder="Invoice or Order #" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1"
                disabled={loading || processing}
              />
              <Button type="submit" variant="gold" disabled={loading || processing}>
                {loading ? "Searching..." : <Search size={16} />}
              </Button>
            </form>
            {error && <p className="mt-3 text-sm text-[#d93025]">{error}</p>}
          </div>

          {order && (
            <div className="rounded-md border bg-white overflow-hidden">
              <div className="border-b px-5 py-4 bg-[#faf9f6] flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">Invoice: {order.invoiceNumber}</h3>
                  <p className="text-xs text-[#706a61] mt-1">{formatDate(order.completedAt)} · {order.customerSnapshot?.name || "Walk-in"}</p>
                </div>
                <div className="text-right">
                  <p className="font-financial font-semibold">{formatMoney(order.totalPaisa)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[#9b7740] mt-1">Paid via {order.payments.map(p => p.method).join(", ")}</p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#706a61]">Select items to return</p>
                
                <div className="space-y-3">
                  {order.items.map(item => {
                    const returnQty = returnItems[item.variantId] || 0;
                    const unitPrice = Math.floor(item.totalPaisa / item.quantity);

                    return (
                      <div key={item.variantId} className={`flex items-center justify-between border rounded-md p-3 transition ${returnQty > 0 ? 'border-[#c9963e] bg-[#fffbf5]' : ''}`}>
                        <div>
                          <p className="font-medium text-sm">{item.productName}</p>
                          <p className="text-xs text-[#706a61] mt-0.5">{item.sku} {item.size && `· ${item.size}`} {item.color && `· ${item.color}`}</p>
                          <p className="text-xs font-financial mt-1">{formatMoney(unitPrice)} each</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-[#706a61]">Max: {item.quantity}</p>
                          <div className="flex items-center border rounded-md">
                            <button 
                              type="button"
                              onClick={() => decrementReturn(item.variantId)}
                              className="px-2 py-1 text-lg hover:bg-gray-100"
                              disabled={returnQty === 0}
                            >-</button>
                            <span className="w-8 text-center font-medium text-sm">{returnQty}</span>
                            <button 
                              type="button"
                              onClick={() => incrementReturn(item.variantId, item.quantity)}
                              className="px-2 py-1 text-lg hover:bg-gray-100"
                              disabled={returnQty === item.quantity}
                            >+</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {hasItemsSelected && (
                  <div className="pt-4 border-t space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#706a61]">Reason for return (optional)</label>
                      <Input 
                        value={reason} 
                        onChange={(e) => setReason(e.target.value)} 
                        placeholder="e.g., Size didn't fit, defective" 
                        className="text-sm"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between bg-[#0b0b0b] text-white p-4 rounded-md">
                      <div>
                        <p className="text-xs text-gray-400">Total Refund</p>
                        <p className="font-financial text-xl font-semibold">{formatMoney(totalRefund)}</p>
                      </div>
                      <Button variant="gold" onClick={submitReturn} disabled={processing}>
                        {processing ? "Processing..." : "Issue Refund"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: History */}
        <div className="rounded-md border bg-white overflow-hidden flex flex-col">
          <div className="border-b px-5 py-4">
            <h3 className="font-semibold text-sm">Return History</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[600px] p-0">
            {loadingHistory ? (
              <p className="p-5 text-sm text-gray-500">Loading history...</p>
            ) : history.length === 0 ? (
              <div className="grid place-items-center p-10 text-center text-[#706a61]">
                <RotateCcw size={24} className="mb-2 opacity-50" />
                <p className="text-sm">No returns processed yet.</p>
              </div>
            ) : (
              <div className="divide-y">
                {history.map(ret => (
                  <div key={ret._id} className="p-4 hover:bg-[#faf9f6]">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-sm">{ret.returnNumber}</p>
                        <p className="text-xs text-[#706a61] mt-0.5">Inv: {ret.invoiceNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-financial font-semibold text-[#8a1a1a]">-{formatMoney(ret.totalRefundPaisa)}</p>
                        <p className="text-[10px] text-[#706a61] mt-0.5">{formatDate(ret.createdAt)}</p>
                      </div>
                    </div>
                    <div className="bg-[#f5f4f0] rounded p-2 mt-2">
                      {ret.items.map((item, idx) => (
                        <p key={idx} className="text-xs text-[#5f584e] flex justify-between">
                          <span>{item.quantity}x {item.productName}</span>
                          <span className="font-financial">{formatMoney(item.refundPaisa)}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
