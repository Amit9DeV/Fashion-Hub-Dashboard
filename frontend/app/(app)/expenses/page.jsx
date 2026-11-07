"use client";

import { useEffect, useState, useMemo } from "react";
import { formatMoney, formatDate } from "@/lib/utils";
import { api } from "@/src/services/api";
import { Plus, Receipt, Trash2, IndianRupee, Store, Zap, Heart, User, Sparkles, Edit2, Calendar, Wallet, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddExpenseModal } from "@/features/expenses/AddExpenseModal";
import EditExpenseModal from "@/components/expenses/EditExpenseModal";
import { toast } from "sonner";

const CATEGORIES = ["ALL", "STOCK", "RENT", "ELECTRICITY", "CASUAL", "PERSONAL", "OTHER"];

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
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL"); // "ALL", "TODAY", "THIS_MONTH", "LAST_MONTH"
  const [searchQuery, setSearchQuery] = useState("");

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
    return expenses.reduce((sum, e) => sum + (e.amountPaisa || 0), 0);
  }, [expenses]);

  const monthExpenses = useMemo(() => {
    const now = new Date();
    return expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, e) => sum + (e.amountPaisa || 0), 0);
  }, [expenses]);

  const { cashExpenses, digitalExpenses } = useMemo(() => {
    let cash = 0;
    let digital = 0;
    for (const e of expenses) {
      if (e.paymentMethod === "CASH") cash += e.amountPaisa || 0;
      else digital += e.amountPaisa || 0;
    }
    return { cashExpenses: cash, digitalExpenses: digital };
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter((e) => {
      // Category filter
      const matchesCategory = selectedCategory === "ALL" || e.category === selectedCategory;
      if (!matchesCategory) return false;

      // Date preset filter
      const d = new Date(e.date);
      if (dateFilter === "TODAY") {
        const isToday =
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear();
        if (!isToday) return false;
      } else if (dateFilter === "THIS_MONTH") {
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) {
          return false;
        }
      } else if (dateFilter === "LAST_MONTH") {
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        if (d.getMonth() !== lastMonth || d.getFullYear() !== lastMonthYear) {
          return false;
        }
      }

      // Query filter
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        e.title?.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q);
      return matchesQuery;
    });
  }, [expenses, selectedCategory, dateFilter, searchQuery]);

  const handleExportCsv = () => {
    if (!filteredExpenses.length) return;
    const headers = ["Date", "Title", "Category", "Payment Method", "Amount (Rs)", "Notes"];
    const rows = filteredExpenses.map((e) => [
      `"${new Date(e.date).toLocaleDateString("en-IN")}"`,
      `"${(e.title || "").replace(/"/g, '""')}"`,
      `"${e.category || ""}"`,
      `"${e.paymentMethod || ""}"`,
      ((e.amountPaisa || 0) / 100).toFixed(2),
      `"${(e.notes || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#dfd8cc] pb-6">
        <div>
          <p className="eyebrow flex items-center gap-2" style={{ color: "#8a3a30" }}>
            <span style={{ width: 16, height: 1, background: "#8a3a30", display: "inline-block" }} />
            Business Accounting
          </p>
          <h2 className="page-headline mt-2 text-2xl sm:text-3xl md:text-4xl">
            Expenses
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#756e64]">Track and manage your business and personal expenses.</p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleExportCsv}
            className="flex-1 sm:flex-initial text-xs h-10 border-[#dfd8cc] text-[#5f584e] hover:text-[#0b0b0b]"
          >
            <Download size={14} className="mr-1.5" /> Export CSV
          </Button>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#0b0b0b] text-[#d8b46a] hover:bg-[#1a1a1a] flex-1 sm:flex-initial justify-center font-semibold text-xs h-10"
          >
            <Plus size={16} className="mr-1.5" /> Record Expense
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-[#e6e0d5] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 text-[#5f584e] mb-2">
            <IndianRupee size={16} className="text-[#8a3a30]" />
            <span className="text-xs font-semibold uppercase tracking-wider">Total Expenses</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#8a3a30] font-financial">{formatMoney(totalExpenses)}</p>
          <p className="mt-1 text-xs text-[#8a847a]">{expenses.length} total recorded items</p>
        </div>

        <div className="rounded-lg border border-[#e6e0d5] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 text-[#5f584e] mb-2">
            <Calendar size={16} className="text-[#9b7740]" />
            <span className="text-xs font-semibold uppercase tracking-wider">This Month</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#151515] font-financial">{formatMoney(monthExpenses)}</p>
          <p className="mt-1 text-xs text-[#8a847a]">Current calendar month spend</p>
        </div>

        <div className="rounded-lg border border-[#e6e0d5] bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 text-[#5f584e] mb-2">
            <Wallet size={16} className="text-[#1a6b3a]" />
            <span className="text-xs font-semibold uppercase tracking-wider">Payment Breakdown</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-[#706a61]">Cash:</span>
            <span className="font-semibold font-financial">{formatMoney(cashExpenses)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-[#706a61]">Online / Bank:</span>
            <span className="font-semibold font-financial">{formatMoney(digitalExpenses)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#e6e0d5] bg-white shadow-xs overflow-hidden">
        {/* Filters bar */}
        <div className="border-b border-[#e6e0d5] bg-[#faf9f6] p-4 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Category tabs */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                    selectedCategory === cat
                      ? "bg-[#0b0b0b] text-[#d8b46a]"
                      : "bg-white border border-[#e6e0d5] text-[#5f584e] hover:bg-[#f0ede7]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-2.5 text-[#8a847a]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search expenses..."
                className="h-8 pl-8 text-xs bg-white"
              />
            </div>
          </div>

          {/* Date range presets */}
          <div className="flex items-center gap-2 pt-1 border-t border-[#f0ede7] text-xs text-[#706a61]">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-[#8a847a]">Period:</span>
            {[
              { id: "ALL", label: "All Time" },
              { id: "TODAY", label: "Today" },
              { id: "THIS_MONTH", label: "This Month" },
              { id: "LAST_MONTH", label: "Last Month" },
            ].map((period) => (
              <button
                key={period.id}
                type="button"
                onClick={() => setDateFilter(period.id)}
                className={`px-2.5 py-0.5 rounded text-xs transition-colors ${
                  dateFilter === period.id
                    ? "bg-[#8a3a30] text-white font-semibold"
                    : "text-[#5f584e] hover:bg-[#eee9df]"
                }`}
              >
                {period.label}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-[#8a847a]">
              Showing {filteredExpenses.length} expense(s)
            </span>
          </div>
        </div>

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
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-[#777169]">
                    <Receipt size={32} className="mx-auto mb-3 text-[#c9963e] opacity-50" />
                    <p>No expenses found matching the current filters.</p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  const Icon = CATEGORY_ICONS[expense.category] || Receipt;
                  return (
                    <tr key={expense._id} className="hover:bg-[#fffcf5] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-[#5f584e] text-xs">
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
                      <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-[#8a3a30] font-financial">
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
