"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function EditExpenseModal({ isOpen, onClose, expense, onExpenseUpdated }) {
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    category: "OTHER",
    paymentMethod: "CASH",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (expense) {
      setFormData({
        title: expense.title,
        amount: (expense.amountPaisa / 100).toFixed(2),
        category: expense.category,
        paymentMethod: expense.paymentMethod,
        notes: expense.notes || "",
      });
      setError("");
    }
  }, [expense]);

  if (!isOpen || !expense) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...formData,
        amountPaisa: Math.round(parseFloat(formData.amount) * 100),
      };
      
      const { api } = await import("@/src/services/api");
      const res = await api.expenses.update(expense._id, payload);
      // api.expenses.update returns the expense document directly (backend returns data: expense)
      onExpenseUpdated(res);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl animate-modal-pop">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Edit Expense</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            ✕
          </button>
        </div>

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title / Purpose</label>
            <Input
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Amount (₹)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category</label>
              <select
                className="w-full h-10 rounded-md border bg-white px-3 text-sm"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="STOCK">Stock / Inventory</option>
                <option value="RENT">Rent</option>
                <option value="ELECTRICITY">Electricity</option>
                <option value="CASUAL">Casual / Misc</option>
                <option value="PERSONAL">Personal</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Payment Method</label>
              <select
                className="w-full h-10 rounded-md border bg-white px-3 text-sm"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
