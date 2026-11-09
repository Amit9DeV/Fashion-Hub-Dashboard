"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  RotateCcw,
  Package,
  FileText,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowRightLeft,
  Receipt,
} from "lucide-react";
import { formatMoney, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/src/services/api";
import { toast } from "sonner";
import InvoiceModal from "@/components/invoice/InvoiceModal";

export default function ReturnsPage() {
  const searchParams = useSearchParams();
  const initialInvoiceParam = searchParams.get("invoice") || searchParams.get("orderId") || searchParams.get("q") || "";
  const [query, setQuery] = useState(initialInvoiceParam);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Mode: "REFUND" or "EXCHANGE"
  const [actionType, setActionType] = useState("REFUND");

  // Return workflow state
  const [returnItems, setReturnItems] = useState({}); // { variantId: quantityToReturn }
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // Exchange replacement items state
  const [exchangeCart, setExchangeCart] = useState([]);
  const [exchangeSearchQuery, setExchangeSearchQuery] = useState("");
  const [exchangeResults, setExchangeResults] = useState([]);
  const [exchangePaymentMethod, setExchangePaymentMethod] = useState("UPI");

  // History state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historySearch, setHistorySearch] = useState("");
  const [viewInvoiceId, setViewInvoiceId] = useState(null);
  const [exchangeIdempotencyKey, setExchangeIdempotencyKey] = useState("");
  const [returnIdempotencyKey, setReturnIdempotencyKey] = useState("");

  const fetchHistory = async () => {
    try {
      const data = await api.returns.getAll();
      setHistory(Array.isArray(data) ? data : data?.returns || data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const executeSearch = useCallback(async (searchQuery) => {
    const q = searchQuery?.trim();
    if (!q) return;

    setLoading(true);
    setError("");
    setOrder(null);
    setReturnItems({});
    setExchangeCart([]);
    setReason("");
    setExchangeIdempotencyKey("");
    setReturnIdempotencyKey("");

    try {
      const data = await api.orders.search(q);
      const found = data?.orders?.[0] || (Array.isArray(data) ? data[0] : null);

      if (!found) {
        setError(`No order found matching "${q}". Verify invoice or customer phone.`);
      } else {
        setOrder(found);
      }
    } catch (err) {
      setError("Failed to fetch order: " + (err.message || "Network error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    if (initialInvoiceParam) {
      executeSearch(initialInvoiceParam);
    }
  }, [initialInvoiceParam, executeSearch]);

  const handleSearch = (e) => {
    e.preventDefault();
    executeSearch(query);
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
      const item = order.items.find(
        (i) => (i.variantId?.toString() || i.variantId) === (variantId?.toString() || variantId)
      );
      if (item && qty > 0) {
        const unitPrice = Math.floor(item.totalPaisa / item.quantity);
        total += unitPrice * qty;
      }
    });
    return total;
  };

  const getAlreadyReturnedQty = (variantId) => {
    if (!order || !history) return 0;
    let returned = 0;
    history.forEach((ret) => {
      if (ret.orderId?.toString() === order._id?.toString()) {
        ret.items.forEach((item) => {
          if (item.variantId?.toString() === variantId?.toString()) {
            returned += item.quantity;
          }
        });
      }
    });
    return returned;
  };

  // Replacement item search
  useEffect(() => {
    if (!exchangeSearchQuery.trim()) {
      setExchangeResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await api.products.search(exchangeSearchQuery);
        setExchangeResults(data.items || []);
      } catch {
        setExchangeResults([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [exchangeSearchQuery]);

  const addExchangeItem = (variant) => {
    setExchangeCart((prev) => {
      const existing = prev.find((i) => i.variantId === variant.variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === variant.variantId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: variant.productId,
          variantId: variant.variantId,
          productName: variant.productName,
          sku: variant.sku,
          color: variant.color,
          size: variant.size,
          quantity: 1,
          sellingPricePaisa: variant.sellingPricePaisa,
          mrpPaisa: variant.mrpPaisa || variant.sellingPricePaisa,
        },
      ];
    });
    setExchangeSearchQuery("");
    setExchangeResults([]);
  };

  const removeExchangeItem = (index) => {
    setExchangeCart((prev) => prev.filter((_, i) => i !== index));
  };

  const totalRefund = calculateTotalRefund();
  const hasItemsSelected = totalRefund > 0;

  const eligibleItems =
    order?.items?.filter((item) => {
      const maxAllowed = item.quantity - getAlreadyReturnedQty(item.variantId);
      return maxAllowed > 0;
    }) || [];

  const exchangeTotalPaisa = exchangeCart.reduce(
    (sum, item) => sum + item.sellingPricePaisa * item.quantity,
    0
  );
  const differencePaisa = exchangeTotalPaisa - totalRefund;

  const submitReturn = async () => {
    const itemsToReturn = Object.entries(returnItems)
      .filter(([_, qty]) => qty > 0)
      .map(([variantId, quantity]) => ({ variantId, quantity }));

    if (itemsToReturn.length === 0) {
      toast.warning("Please select at least one item to return.");
      return;
    }

    setProcessing(true);
    const idempotencyKey = returnIdempotencyKey || crypto.randomUUID();
    if (!returnIdempotencyKey) setReturnIdempotencyKey(idempotencyKey);
    try {
      await api.returns.process({
        orderId: order._id,
        idempotencyKey,
        reason,
        items: itemsToReturn,
      });
      toast.success("Return processed successfully!");
      setOrder(null);
      setReturnItems({});
      setReturnIdempotencyKey("");
      setQuery("");
      fetchHistory();
    } catch (err) {
      toast.error(err.message || "Failed to process return.");
    } finally {
      setProcessing(false);
    }
  };

  const submitExchange = async () => {
    const itemsToReturn = Object.entries(returnItems)
      .filter(([_, qty]) => qty > 0)
      .map(([variantId, quantity]) => ({ variantId, quantity }));

    if (itemsToReturn.length === 0) {
      toast.warning("Please select at least one item to return.");
      return;
    }
    if (exchangeCart.length === 0) {
      toast.warning("Please add at least one replacement item for exchange.");
      return;
    }

    const netPayable = Math.max(0, differencePaisa);
    const idempotencyKey = exchangeIdempotencyKey || crypto.randomUUID();
    if (!exchangeIdempotencyKey) setExchangeIdempotencyKey(idempotencyKey);
    const payments = [];
    if (netPayable > 0) {
      payments.push({
        method: exchangePaymentMethod,
        amountPaisa: netPayable,
      });
    }

    setProcessing(true);
    try {
      const res = await api.returns.exchange({
        returnPayload: {
          orderId: order._id,
          idempotencyKey,
          reason: reason || "Customer garment exchange",
          items: itemsToReturn,
        },
        salePayload: {
          idempotencyKey,
          items: exchangeCart.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            overriddenPricePaisa: item.sellingPricePaisa,
            overriddenMrpPaisa: item.mrpPaisa,
          })),
          discountPaisa: 0,
          payments,
          customer: order.customerId
            ? { customerId: order.customerId }
            : order.customerSnapshot?.name
            ? order.customerSnapshot
            : null,
        },
      });

      toast.success(
        `Exchange completed! New bill #${res.sale?.invoiceNumber || ""} issued and items restocked.`
      );
      if (res.sale?.invoiceId || res.sale?._id) {
        setViewInvoiceId(res.sale.invoiceId || res.sale._id);
      }
      setOrder(null);
      setReturnItems({});
      setExchangeCart([]);
      setQuery("");
      fetchHistory();
    } catch (err) {
      toast.error(err.message || "Failed to process exchange.");
    } finally {
      setProcessing(false);
    }
  };

  const filteredHistory = history.filter((ret) => {
    if (!historySearch.trim()) return true;
    const s = historySearch.toLowerCase();
    return (
      ret.returnNumber?.toLowerCase().includes(s) ||
      ret.invoiceNumber?.toLowerCase().includes(s) ||
      ret.reason?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-7 pb-10">
      <div className="border-b border-[#dfd8cc] pb-6">
        <p className="eyebrow flex items-center gap-2" style={{ color: "#5a2a7a" }}>
          <span style={{ width: 16, height: 1, background: "#5a2a7a", display: "inline-block" }} />
          Reverse Logistics & Exchanges
        </p>
        <h2 className="page-headline mt-2 text-2xl sm:text-3xl md:text-4xl">
          Returns & Exchanges
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-[#756e64]">
          Process refunds or instantly exchange products with automatic inventory restocking and billing adjustments.
        </p>
      </div>

      <div className="grid gap-7 lg:grid-cols-2">
        {/* Left Col: Search & Process */}
        <div className="space-y-6">
          <div className="rounded-md border bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-sm text-[#0b0b0b]">Find Original Order</h3>
            <form onSubmit={handleSearch} className="mt-4 flex gap-3">
              <Input
                placeholder="Invoice # (e.g. INV-2526-0001) or Order #"
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
            <div className="rounded-md border bg-white overflow-hidden shadow-sm">
              <div className="border-b px-4 sm:px-5 py-3 sm:py-4 bg-[#faf9f6] flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                <div>
                  <h3 className="font-semibold text-[#0b0b0b]">Invoice: {order.invoiceNumber}</h3>
                  <p className="text-xs text-[#706a61] mt-1">
                    {formatDate(order.completedAt)} · {order.customerSnapshot?.name || "Walk-in"}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-financial font-semibold text-[#1a6b3a]">{formatMoney(order.totalPaisa)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[#9b7740] mt-1">
                    Paid via {(order.payments || []).map((p) => p.method).join(", ") || "—"}
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#706a61]">
                  Select item(s) to return
                </p>

                {eligibleItems.length === 0 ? (
                  <div className="rounded-md bg-[#faf9f6] border border-[#e6e0d5] p-5 text-center text-xs text-[#706a61]">
                    <p className="font-semibold text-[#8a5a10]">All items returned</p>
                    <p className="mt-1">
                      All products in invoice {order.invoiceNumber} have already been refunded or returned.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {order.items.map((item) => {
                      const returnQty = returnItems[item.variantId] || 0;
                      const unitPrice = Math.floor(item.totalPaisa / item.quantity);
                      const maxAllowed = item.quantity - getAlreadyReturnedQty(item.variantId);

                      if (maxAllowed <= 0) return null;

                      return (
                        <div
                          key={item.variantId}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded-md p-3 transition ${
                            returnQty > 0 ? "border-[#c9963e] bg-[#fffbf5]" : ""
                          }`}
                        >
                          <div>
                            <p className="font-medium text-sm text-[#0b0b0b]">{item.productName}</p>
                            <p className="text-xs text-[#706a61] mt-0.5">
                              {item.sku} {item.size && `· ${item.size}`} {item.color && `· ${item.color}`}
                            </p>
                            <p className="text-xs font-financial mt-1 text-[#5f584e]">
                              {formatMoney(unitPrice)} each
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-xs text-[#706a61]">Max: {maxAllowed}</p>
                            <div className="flex items-center border rounded-md bg-white">
                              <button
                                type="button"
                                onClick={() => decrementReturn(item.variantId)}
                                className="px-2.5 py-1 text-base hover:bg-gray-100 transition-colors"
                                disabled={returnQty === 0}
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-semibold text-sm">{returnQty}</span>
                              <button
                                type="button"
                                onClick={() => incrementReturn(item.variantId, maxAllowed)}
                                className="px-2.5 py-1 text-base hover:bg-gray-100 transition-colors"
                                disabled={returnQty === maxAllowed}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {hasItemsSelected && (
                  <div className="pt-4 border-t space-y-4">
                    {/* Reason */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#706a61]">
                        Reason for return / exchange (optional)
                      </label>
                      <Input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Size exchange, defective zipper, customer preferred another color"
                        className="text-sm bg-white"
                      />
                    </div>

                    {/* Mode Selector */}
                    <div className="flex rounded-md border p-1 bg-[#faf9f6]">
                      <button
                        type="button"
                        onClick={() => setActionType("REFUND")}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5 ${
                          actionType === "REFUND"
                            ? "bg-white text-[#0b0b0b] shadow-sm"
                            : "text-[#706a61] hover:text-[#0b0b0b]"
                        }`}
                      >
                        <RotateCcw size={13} /> Return & Refund Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionType("EXCHANGE")}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5 ${
                          actionType === "EXCHANGE"
                            ? "bg-[#c9963e] text-white shadow-sm"
                            : "text-[#706a61] hover:text-[#0b0b0b]"
                        }`}
                      >
                        <ArrowRightLeft size={13} /> Exchange for New Items
                      </button>
                    </div>

                    {/* REFUND MODE */}
                    {actionType === "REFUND" && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b0b0b] text-white p-4 rounded-md">
                        <div>
                          <p className="text-xs text-gray-400">Total Refund to Customer</p>
                          <p className="font-financial text-xl font-semibold text-[#d8b46a]">
                            {formatMoney(totalRefund)}
                          </p>
                        </div>
                        <Button
                          variant="gold"
                          onClick={submitReturn}
                          disabled={processing}
                          className="w-full sm:w-auto justify-center"
                        >
                          {processing ? "Processing..." : "Issue Refund"}
                        </Button>
                      </div>
                    )}

                    {/* EXCHANGE MODE */}
                    {actionType === "EXCHANGE" && (
                      <div className="space-y-4 rounded-lg border border-[#e6e0d5] bg-[#fffcf5] p-4">
                        <div className="flex items-center justify-between border-b pb-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-[#9b7740]">
                            Replacement Garments
                          </p>
                          <span className="text-xs text-[#706a61]">
                            Credit Available: <strong className="text-[#1a6b3a]">{formatMoney(totalRefund)}</strong>
                          </span>
                        </div>

                        {/* Search replacement */}
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 size-3.5 text-[#8a847a]" />
                          <Input
                            placeholder="Search replacement product / size / barcode..."
                            value={exchangeSearchQuery}
                            onChange={(e) => setExchangeSearchQuery(e.target.value)}
                            className="pl-8 h-8 text-xs bg-white"
                          />
                        </div>

                        {exchangeResults.length > 0 && (
                          <div className="max-h-40 overflow-y-auto rounded-md border bg-white shadow-md divide-y">
                            {exchangeResults.map((item) => (
                              <button
                                key={item.variantId}
                                type="button"
                                onClick={() => addExchangeItem(item)}
                                className="w-full px-3 py-2 text-left hover:bg-[#fffcf5] flex items-center justify-between text-xs"
                              >
                                <div>
                                  <p className="font-semibold text-[#0b0b0b]">{item.productName}</p>
                                  <p className="text-[10px] text-[#706a61]">
                                    {[item.sku, item.color, item.size].filter(Boolean).join(" · ")} · Stock:{" "}
                                    {item.stock}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold font-financial">
                                    {formatMoney(item.sellingPricePaisa)}
                                  </p>
                                  <span className="text-[10px] text-[#c9963e]">+ Select</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Selected Replacement Cart */}
                        {exchangeCart.length > 0 ? (
                          <div className="space-y-2 border rounded-md p-2 bg-white">
                            {exchangeCart.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs py-1 border-b last:border-b-0"
                              >
                                <div>
                                  <p className="font-semibold text-[#0b0b0b]">{item.productName}</p>
                                  <p className="text-[10px] text-[#706a61]">
                                    {[item.sku, item.color, item.size].filter(Boolean).join(" · ")} (Qty:{" "}
                                    {item.quantity})
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-financial font-semibold">
                                    {formatMoney(item.sellingPricePaisa * item.quantity)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeExchangeItem(idx)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-[#8a847a] italic text-center py-2">
                            Select replacement items above to complete exchange.
                          </p>
                        )}

                        {/* Settlement Calculation */}
                        <div className="rounded-md bg-white border p-3 text-xs space-y-1.5 divide-y divide-gray-100">
                          <div className="flex justify-between text-[#706a61]">
                            <span>Credit from returned items:</span>
                            <span className="font-financial text-[#1a6b3a]">−{formatMoney(totalRefund)}</span>
                          </div>
                          <div className="flex justify-between text-[#706a61] pt-1.5">
                            <span>New items total:</span>
                            <span className="font-financial">{formatMoney(exchangeTotalPaisa)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-sm text-[#0b0b0b] pt-1.5">
                            <span>
                              {differencePaisa >= 0
                                ? "Net Balance to Collect:"
                                : "Balance to Refund to Customer:"}
                            </span>
                            <span
                              className={`font-financial ${
                                differencePaisa >= 0 ? "text-[#1a3a7a]" : "text-[#1a6b3a]"
                              }`}
                            >
                              {formatMoney(Math.abs(differencePaisa))}
                            </span>
                          </div>
                        </div>

                        {differencePaisa > 0 && (
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="text-xs font-medium text-[#5f584e]">Collect Balance Via:</span>
                            <select
                              value={exchangePaymentMethod}
                              onChange={(e) => setExchangePaymentMethod(e.target.value)}
                              className="h-8 rounded border bg-white px-2 text-xs font-semibold"
                            >
                              <option value="UPI">UPI</option>
                              <option value="CASH">CASH</option>
                              <option value="CARD">CARD</option>
                            </select>
                          </div>
                        )}

                        <Button
                          variant="gold"
                          onClick={submitExchange}
                          disabled={processing || exchangeCart.length === 0}
                          className="w-full justify-center"
                        >
                          {processing ? "Processing Exchange..." : "Complete Exchange & Issue Bill"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: History */}
        <div className="rounded-md border bg-white overflow-hidden flex flex-col shadow-sm">
          <div className="border-b px-5 py-3.5 bg-[#faf9f6] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-semibold text-sm text-[#0b0b0b]">Return & Exchange History</h3>
            <div className="w-full sm:w-48">
              <Input
                placeholder="Search history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[600px] p-0">
            {loadingHistory ? (
              <p className="p-5 text-sm text-gray-500">Loading history...</p>
            ) : filteredHistory.length === 0 ? (
              <div className="grid place-items-center p-10 text-center text-[#706a61]">
                <RotateCcw size={24} className="mb-2 opacity-50" />
                <p className="text-sm">
                  {historySearch ? "No matching returns found." : "No returns or exchanges recorded yet."}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredHistory.map((ret) => (
                  <div key={ret._id} className="p-4 hover:bg-[#faf9f6] transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-sm text-[#0b0b0b]">{ret.returnNumber}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-[#706a61]">Inv:</span>
                          <button
                            type="button"
                            onClick={() => setViewInvoiceId(ret.invoiceNumber || ret.orderId)}
                            className="font-mono text-xs font-semibold text-[#9b7740] hover:underline flex items-center gap-1"
                            title="View original invoice"
                          >
                            <Receipt size={12} /> {ret.invoiceNumber}
                          </button>
                        </div>
                        {ret.reason && (
                          <p className="text-[11px] text-[#8a5a10] mt-1 bg-[#fffbf2] border border-[#f0e3c5] rounded px-2 py-0.5 inline-block">
                            Reason: {ret.reason}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-financial font-semibold text-[#8a1a1a]">
                          −{formatMoney(ret.totalRefundPaisa)}
                        </p>
                        <p className="text-[10px] text-[#706a61] mt-0.5">{formatDate(ret.createdAt)}</p>
                      </div>
                    </div>
                    <div className="bg-[#f5f4f0] rounded p-2 mt-2">
                      {ret.items.map((item, idx) => (
                        <p key={idx} className="text-xs text-[#5f584e] flex justify-between">
                          <span>
                            {item.quantity}x {item.productName}
                          </span>
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

      <InvoiceModal
        isOpen={!!viewInvoiceId}
        onClose={() => setViewInvoiceId(null)}
        invoiceId={viewInvoiceId}
      />
    </div>
  );
}
