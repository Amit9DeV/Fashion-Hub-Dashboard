"use client";

import { useState, useEffect } from "react";
import { Vault, X, ArrowUpRight, ArrowDownLeft, AlertTriangle, CheckCircle2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";
import { api } from "@/src/services/api";
import { toast } from "sonner";

export function CashDrawerModal({ isOpen, onClose }) {
  const [drawer, setDrawer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("VIEW"); // VIEW, OPEN, CLOSE
  const [openingBalance, setOpeningBalance] = useState("");
  const [closingCount, setClosingCount] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await api.cashDrawer.getStatus();
      setDrawer(data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDrawer = async (e) => {
    e.preventDefault();
    const float = Math.round(parseFloat(openingBalance || 0) * 100);
    setSubmitting(true);
    try {
      const res = await api.cashDrawer.open({ openingBalancePaisa: float });
      setDrawer(res || null);
      setMode("VIEW");
      toast.success("Cash drawer opened successfully for today's shift");
    } catch (err) {
      toast.error(err.message || "Failed to open drawer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseDrawer = async (e) => {
    e.preventDefault();
    const actual = Math.round(parseFloat(closingCount || 0) * 100);
    setSubmitting(true);
    try {
      const res = await api.cashDrawer.close({
        actualClosingBalancePaisa: actual,
        notes: closingNotes,
      });
      setDrawer(res || null);
      setMode("VIEW");
      toast.success("Cash drawer closed & shift reconciled successfully");
    } catch (err) {
      toast.error(err.message || "Failed to close drawer");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isOpenShift = drawer?.status === "OPEN";
  const expectedCashPaisa = isOpenShift
    ? (drawer.openingBalancePaisa || 0) + 
      (drawer.cashSalesPaisa || 0) - 
      (drawer.cashExpensesPaisa || 0) - 
      (drawer.cashRefundsPaisa || 0)
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden border border-[#e8e3da]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-[#faf9f6] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className={`size-8 rounded-full flex items-center justify-center ${isOpenShift ? "bg-[#f0f9f4] text-[#1a6b3a] border border-[#a3d9b8]" : "bg-gray-100 text-gray-600"}`}>
              <Vault size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[#0b0b0b]">Cash Drawer</h3>
              <p className="text-xs text-[#706a61]">Register float & cash reconciliation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8a847a] hover:text-[#0b0b0b] transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="py-8 text-center text-xs text-[#706a61]">Checking cash drawer status...</div>
          ) : mode === "OPEN" ? (
            /* Open Drawer Form */
            <form onSubmit={handleOpenDrawer} className="space-y-4">
              <div className="rounded-lg bg-[#faf9f6] border p-3 text-xs text-[#5f584e]">
                <p className="font-semibold text-[#0b0b0b] mb-1">Start Today&apos;s Shift</p>
                Enter the starting cash float present in the register cash box before making sales.
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                  Opening Cash Float (₹)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  autoFocus
                  placeholder="e.g. 2000.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="h-10 text-base font-semibold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setMode("VIEW")}>
                  Cancel
                </Button>
                <Button type="submit" variant="gold" size="sm" disabled={submitting}>
                  {submitting ? "Opening..." : "Open Drawer"}
                </Button>
              </div>
            </form>
          ) : mode === "CLOSE" ? (
            /* Close Drawer Form */
            <form onSubmit={handleCloseDrawer} className="space-y-4">
              <div className="rounded-lg bg-[#fffcf5] border border-[#e8d5b5] p-3 text-xs text-[#7a5c20]">
                <p className="font-semibold mb-0.5">End-of-Day Shift Close</p>
                Count the physical cash bills & coins currently in the register drawer.
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                    Physical Cash Count (₹)
                  </label>
                  <span className="text-xs text-[#706a61]">
                    Expected: <strong>{formatMoney(expectedCashPaisa)}</strong>
                  </span>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  autoFocus
                  placeholder="e.g. 5450.00"
                  value={closingCount}
                  onChange={(e) => setClosingCount(e.target.value)}
                  className="h-10 text-base font-semibold"
                />
              </div>

              {closingCount && (
                <div className="p-2.5 rounded bg-[#faf9f6] border text-xs flex justify-between items-center">
                  <span>Reconciliation Difference:</span>
                  {(() => {
                    const diff = Math.round(parseFloat(closingCount || 0) * 100) - expectedCashPaisa;
                    if (diff === 0) return <span className="text-[#1a6b3a] font-bold">Exact match (₹0.00)</span>;
                    if (diff > 0) return <span className="text-[#1a6b3a] font-bold">+{formatMoney(diff)} Surplus</span>;
                    return <span className="text-[#8a1a1a] font-bold">{formatMoney(diff)} Shortage</span>;
                  })()}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                  Closing Notes (optional)
                </label>
                <Input
                  placeholder="Notes on variances, bank drops, or shift handoff"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setMode("VIEW")}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" size="sm" disabled={submitting}>
                  {submitting ? "Closing..." : "Close & Reconcile Shift"}
                </Button>
              </div>
            </form>
          ) : (
            /* View Drawer Status */
            <div className="space-y-5">
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#faf9f6] border border-[#e6e0d5]">
                <div>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider rounded px-2 py-0.5 ${isOpenShift ? "bg-[#f0f9f4] text-[#1a6b3a]" : "bg-gray-100 text-gray-700"}`}>
                    {isOpenShift ? <Unlock size={11} /> : <Lock size={11} />}
                    {isOpenShift ? "Drawer Open" : "Drawer Closed"}
                  </span>
                  <p className="text-xs text-[#706a61] mt-1">
                    {isOpenShift ? `Started on ${new Date(drawer.date).toLocaleDateString()}` : "No active cash session"}
                  </p>
                </div>
                {isOpenShift && (
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-[#8a847a]">Live Cash in Box</p>
                    <p className="font-financial text-xl font-bold text-[#1a6b3a] mt-0.5">
                      {formatMoney(expectedCashPaisa)}
                    </p>
                  </div>
                )}
              </div>

              {isOpenShift ? (
                <div className="space-y-2 text-xs border rounded-lg p-3.5 bg-white divide-y divide-[#f0ede7]">
                  <div className="flex justify-between py-1.5 text-[#5f584e]">
                    <span>Opening Float:</span>
                    <strong className="font-financial text-[#0b0b0b]">{formatMoney(drawer.openingBalancePaisa || 0)}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 text-[#5f584e]">
                    <span className="flex items-center gap-1 text-[#1a6b3a]">
                      <ArrowDownLeft size={13} /> Cash Sales (In):
                    </span>
                    <strong className="font-financial text-[#1a6b3a]">+{formatMoney(drawer.cashSalesPaisa || 0)}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 text-[#5f584e]">
                    <span className="flex items-center gap-1 text-[#8a1a1a]">
                      <ArrowUpRight size={13} /> Cash Expenses (Out):
                    </span>
                    <strong className="font-financial text-[#8a1a1a]">−{formatMoney(drawer.cashExpensesPaisa || 0)}</strong>
                  </div>
                  {drawer.cashRefundsPaisa > 0 && (
                    <div className="flex justify-between py-1.5 text-[#5f584e]">
                      <span className="flex items-center gap-1 text-[#8a5a10]">
                        <ArrowUpRight size={13} /> Cash Refunds (Out):
                      </span>
                      <strong className="font-financial text-[#8a5a10]">−{formatMoney(drawer.cashRefundsPaisa || 0)}</strong>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 font-bold text-sm text-[#0b0b0b]">
                    <span>Expected Total Cash:</span>
                    <span className="font-financial text-[#1a6b3a] text-base">{formatMoney(expectedCashPaisa)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-[#706a61]">
                  Open a new cash drawer session at the start of your billing day to track live cash balances.
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t">
                {isOpenShift ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setClosingCount("");
                      setClosingNotes("");
                      setMode("CLOSE");
                    }}
                    className="h-8 text-xs text-[#8a1a1a] border-[#f5c6cb] hover:bg-[#fff5f5]"
                  >
                    Close Shift
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="gold"
                    size="sm"
                    onClick={() => {
                      setOpeningBalance("");
                      setMode("OPEN");
                    }}
                    className="h-8 text-xs px-4"
                  >
                    Open New Drawer
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
