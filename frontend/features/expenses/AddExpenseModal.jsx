"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/src/services/api";
import { toast } from "sonner";

export function AddExpenseModal({ isOpen, onClose, onExpenseAdded }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "OTHER",
    paymentMethod: "CASH",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    if (!form.title || !form.amount || !form.category) {
      setError("Title, amount, and category are required.");
      setBusy(false);
      return;
    }

    const amountPaisa = Math.round(Number(form.amount) * 100);

    try {
      const expense = await api.expenses.create({
        title: form.title,
        amountPaisa,
        category: form.category,
        paymentMethod: form.paymentMethod,
        date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
        notes: form.notes,
      });

      onExpenseAdded(expense);
      toast.success("Expense recorded successfully");
      onClose();
      setForm({
        title: "",
        amount: "",
        category: "OTHER",
        paymentMethod: "CASH",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
    } catch (err) {
      toast.error(err.message || "Failed to add expense");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-lg bg-[#faf9f6] p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-modal-pop">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#8a847a] hover:text-[#c9963e]"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-semibold text-[#151515] mb-6">
          Record New Expense
        </h2>

        {error && (
          <div className="mb-4 rounded-md bg-[#fff4f0] p-3 text-sm text-[#852c21] border border-[#e0ae9f]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#5f584e] uppercase tracking-wider">
              Title / Description
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Electricity Bill, Paid Rent"
              className="bg-white border-[#e6e0d5] focus:border-[#c9963e]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#5f584e] uppercase tracking-wider">
                Amount (₹)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="bg-white border-[#e6e0d5] focus:border-[#c9963e]"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#5f584e] uppercase tracking-wider">
                Date
              </label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="bg-white border-[#e6e0d5] focus:border-[#c9963e]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#5f584e] uppercase tracking-wider">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-10 rounded-md border border-[#e6e0d5] bg-white px-3 text-sm focus:outline-none focus:border-[#c9963e]"
                required
              >
                <option value="STOCK">Stock/Inventory</option>
                <option value="RENT">Rent</option>
                <option value="ELECTRICITY">Electricity</option>
                <option value="CASUAL">Casual/Misc</option>
                <option value="PERSONAL">Personal</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#5f584e] uppercase tracking-wider">
                Payment Method
              </label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className="w-full h-10 rounded-md border border-[#e6e0d5] bg-white px-3 text-sm focus:outline-none focus:border-[#c9963e]"
                required
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#5f584e] uppercase tracking-wider">
              Notes (Optional)
            </label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any additional details..."
              className="bg-white border-[#e6e0d5] focus:border-[#c9963e]"
            />
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-[#e6e0d5]"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#0b0b0b] text-[#d8b46a] hover:bg-[#1a1a1a]"
              disabled={busy}
            >
              {busy ? "Saving..." : "Record Expense"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
