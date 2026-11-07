"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, X, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";
import { api } from "@/src/services/api";
import { toast } from "sonner";

export default function SettleDuesModal({ customer, onSuccess }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const duesPaisa = customer?.stats?.totalDuesPaisa || 0;
  const [amountRupees, setAmountRupees] = useState((duesPaisa / 100).toString());
  const [method, setMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (duesPaisa <= 0) return null;

  const handleOpen = () => {
    setAmountRupees((duesPaisa / 100).toString());
    setMethod("CASH");
    setNotes("");
    setError("");
    setIsOpen(true);
  };

  const handleSettle = async (e) => {
    e.preventDefault();
    const amountVal = parseFloat(amountRupees);
    if (!amountVal || isNaN(amountVal) || amountVal <= 0) {
      setError("Please enter a valid positive payment amount.");
      return;
    }

    const amountPaisa = Math.round(amountVal * 100);
    if (amountPaisa > duesPaisa) {
      setError(`Payment cannot exceed current outstanding dues (${formatMoney(duesPaisa)}).`);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await api.customers.settleDues(customer._id, {
        amountPaisa,
        method,
        notes,
      });

      toast.success(res.message || "Dues payment recorded successfully!");
      setIsOpen(false);
      router.refresh();
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      setError(err.message || "Failed to record dues payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleOpen}
        className="h-9 text-xs border-[#e0ae9f] bg-[#fff8f6] text-[#8a2f20] hover:bg-[#ffedea] hover:text-[#701c10] font-semibold flex items-center gap-1.5"
      >
        <HandCoins size={14} className="text-[#a53a2d]" />
        Settle Dues ({formatMoney(duesPaisa)})
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-lg border border-[#e8e3da] bg-white p-6 shadow-xl animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#f0ede7] pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9b7740]">
                  Receivables Settle
                </p>
                <h3 className="text-lg font-semibold text-[#151515] mt-0.5">
                  Record Dues Payment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded p-1 text-[#8a847a] hover:bg-[#faf9f6] hover:text-[#151515]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSettle} className="mt-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-md border border-[#e0ae9f] bg-[#fff5f5] p-3 text-xs text-[#852c21]">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="rounded-md border border-[#f0ede7] bg-[#faf9f6] p-3 text-xs">
                <div className="flex justify-between items-center text-[#706a61]">
                  <span>Customer:</span>
                  <span className="font-semibold text-[#151515]">{customer.name}</span>
                </div>
                <div className="mt-1 flex justify-between items-center">
                  <span className="text-[#706a61]">Current Outstanding:</span>
                  <span className="font-financial font-bold text-sm text-[#8a2f20]">
                    {formatMoney(duesPaisa)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5f584e] mb-1.5">
                  Amount Received (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-[#8a847a]">₹</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    max={duesPaisa / 100}
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                    required
                    className="pl-7 font-financial font-semibold text-base"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAmountRupees((duesPaisa / 100).toString())}
                    className="rounded border border-[#e6e0d5] bg-white px-2 py-1 text-[11px] font-medium text-[#706a61] hover:border-[#9b7740] hover:text-[#9b7740]"
                  >
                    Full: {formatMoney(duesPaisa)}
                  </button>
                  {duesPaisa > 200 && (
                    <button
                      type="button"
                      onClick={() => setAmountRupees((duesPaisa / 200).toFixed(2))}
                      className="rounded border border-[#e6e0d5] bg-white px-2 py-1 text-[11px] font-medium text-[#706a61] hover:border-[#9b7740] hover:text-[#9b7740]"
                    >
                      50%: {formatMoney(Math.round(duesPaisa / 2))}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5f584e] mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["CASH", "UPI", "CARD", "OTHER"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`py-2 text-xs font-semibold rounded border transition-colors ${
                        method === m
                          ? "border-[#0b0b0b] bg-[#0b0b0b] text-[#d8b46a]"
                          : "border-[#e6e0d5] bg-white text-[#5f584e] hover:bg-[#faf9f6]"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5f584e] mb-1.5">
                  Reference / Notes (Optional)
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Settle cash at shop, UPI ref 12345"
                  className="text-xs"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2.5 pt-3 border-t border-[#f0ede7]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={submitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  disabled={submitting}
                  className="text-xs font-semibold"
                >
                  {submitting ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

