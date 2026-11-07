"use client";

import { useEffect, useState, useMemo } from "react";
import { formatMoney, formatDate } from "@/lib/utils";
import { api } from "@/src/services/api";
import { Plus, Receipt, Trash2, IndianRupee, Store, Zap, Heart, User, Sparkles, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddExpenseModal } from "@/features/expenses/AddExpenseModal";
import EditExpenseModal from "@/components/expenses/EditExpenseModal";
import { toast } from "sonner";

const CATEGORY_ICONS = {
  STOCK: Store,
  RENT: Store,
  ELECTRICITY: Zap,
  CASUAL: Sparkles,
  PERSONAL: User,
  OTHER: Receipt,
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [busy, setBusy] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  async function fetchExpenses() {
    try {
      const data = await api.expenses.getAll();
      setExpenses(data.expenses || []);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      await api.expenses.delete(id);
      setExpenses((prev) => prev.filter((e) => e._id !== id));
      toast.success("Expense deleted successfully");
    } catch (err) {
      toast.error(err.message || "Failed to delete expense");
    }
  };

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amountPaisa, 0);
  }, [expenses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#151515]">Expenses</h1>
          <p className="text-sm text-[#777169]">Track and manage your business and personal expenses</p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0b0b0b] text-[#d8b46a] hover:bg-[#1a1a1a] w-full sm:w-auto justify-center"
        >
          <Plus size={16} className="mr-2" /> Record Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-[#e6e0d5] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 text-[#5f584e] mb-2">
            <IndianRupee size={18} />
            <span className="text-sm font-semibold uppercase tracking-wider">Total Expenses</span>
          </div>
          <p className="text-3xl font-bold text-[#8a3a30]">{formatMoney(totalExpenses)}</p>
        </div>
      </div>

      <div className="rounded-lg border border-[#e6e0d5] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#faf9f6] border-b border-[#e6e0d5] text-[#5f584e]">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Date</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Details</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Category</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Amount</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ede7]">
              {busy ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-[#777169]">Loading expenses...</td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-[#777169]">
                    <Receipt size={32} className="mx-auto mb-3 text-[#c9963e] opacity-50" />
                    <p>No expenses recorded yet.</p>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => {
                  const Icon = CATEGORY_ICONS[expense.category] || Receipt;
                  return (
                    <tr key={expense._id} className="hover:bg-[#fffcf5] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-[#5f584e]">
                        {formatDate(expense.date)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#151515]">{expense.title}</p>
                        {expense.notes && <p className="text-xs text-[#777169] mt-1 line-clamp-1">{expense.notes}</p>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0ede7] px-2.5 py-1 text-[10px] font-semibold text-[#5f584e]">
                          <Icon size={12} />
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-[#8a3a30]">
                        {formatMoney(expense.amountPaisa)}
                        <p className="text-[10px] font-normal text-[#8a847a] mt-0.5">{expense.paymentMethod}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => setEditExpense(expense)}
                            className="text-[#c9963e] hover:text-[#9b7740] transition-colors"
                            title="Edit expense"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(expense._id)}
                            className="text-[#8a3a30] hover:text-[#5d1611] transition-colors"
                            title="Delete expense"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onExpenseAdded={(newExpense) => {
          setExpenses((prev) => [newExpense, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
        }}
      />
      <EditExpenseModal
        isOpen={!!editExpense}
        onClose={() => setEditExpense(null)}
        expense={editExpense}
        onExpenseUpdated={(updatedExpense) => {
          setExpenses((prev) => prev.map(e => e._id === updatedExpense._id ? updatedExpense : e).sort((a, b) => new Date(b.date) - new Date(a.date)));
        }}
      />
    </div>
  );
}
