"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/utils";
import DeleteCustomerButton from "@/components/customers/DeleteCustomerButton";
import EditCustomerButton from "@/components/customers/EditCustomerButton";
import AddCustomerModal from "@/components/customers/AddCustomerModal";
import SettleDuesModal from "@/components/customers/SettleDuesModal";
import { UsersRound, Plus, Download, HandCoins, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomerTable({ customers: initialCustomers }) {
  const router = useRouter();
  const [customers, setCustomers] = useState(initialCustomers || []);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterMode, setFilterMode] = useState("ALL"); // "ALL" | "DUES"

  const customersWithDues = useMemo(() => {
    return customers.filter(c => (c.stats?.totalDuesPaisa || 0) > 0);
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    if (filterMode === "DUES") {
      return customersWithDues;
    }
    return customers;
  }, [customers, filterMode, customersWithDues]);

  const totalDuesAll = useMemo(() => {
    return customersWithDues.reduce((sum, c) => sum + (c.stats?.totalDuesPaisa || 0), 0);
  }, [customersWithDues]);

  const handleExportCsv = () => {
    if (!customers.length) return;
    const headers = ["Customer Name", "Mobile", "WhatsApp", "Email", "GSTIN", "Total Orders", "Total Spent (Rs)", "Outstanding Dues (Rs)"];
    const rows = customers.map(c => [
      `"${(c.name || "Unknown").replace(/"/g, '""')}"`,
      `"${c.mobile || ""}"`,
      `"${c.whatsappNumber || ""}"`,
      `"${c.email || ""}"`,
      `"${c.gstin || ""}"`,
      c.stats?.totalOrders || 0,
      ((c.stats?.totalSpentPaisa || 0) / 100).toFixed(2),
      ((c.stats?.totalDuesPaisa || 0) / 100).toFixed(2),
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!customers || customers.length === 0) {
    return (
      <>
        <div className="grid min-h-48 place-items-center p-6 text-center">
          <div>
            <UsersRound className="mx-auto text-[#c9963e]" size={24} />
            <p className="mt-3 text-sm text-[#706a61]">No customers found.</p>
            <Button
              variant="gold"
              className="mt-4"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus size={16} className="mr-2" /> Add First Customer
            </Button>
          </div>
        </div>
        <AddCustomerModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onCustomerAdded={(newCustomer) => {
            setCustomers(prev => [newCustomer, ...prev]);
          }}
        />
      </>
    );
  }

  return (
    <>
      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b px-5 py-3 bg-[#faf9f6] gap-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-[#dfd8cc] p-0.5 bg-white text-xs">
            <button
              type="button"
              onClick={() => setFilterMode("ALL")}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                filterMode === "ALL"
                  ? "bg-[#0b0b0b] text-white"
                  : "text-[#706a61] hover:text-[#0b0b0b]"
              }`}
            >
              All ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("DUES")}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                filterMode === "DUES"
                  ? "bg-[#8a2f20] text-white"
                  : "text-[#8a2f20] hover:bg-[#ffebe6]"
              }`}
            >
              With Dues ({customersWithDues.length})
              {totalDuesAll > 0 && (
                <span className="ml-1 opacity-80 font-normal">
                  ({formatMoney(totalDuesAll)})
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs text-[#5f584e]"
            onClick={handleExportCsv}
          >
            <Download size={13} className="mr-1.5" /> Export CSV
          </Button>

          <Button
            size="sm"
            variant="gold"
            className="h-8 px-3 text-xs"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={14} className="mr-1.5" /> Add Customer
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[750px] text-left text-sm">
          <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-[#81796d]">
            <tr>
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Contact</th>
              <th className="px-5 py-3 font-semibold text-right">Orders</th>
              <th className="px-5 py-3 font-semibold text-right">Total Spent</th>
              <th className="px-5 py-3 font-semibold text-right">Outstanding Dues</th>
              <th className="px-5 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-[#706a61]">
                  {filterMode === "DUES" ? "No customers with outstanding dues!" : "No customers found."}
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => {
                const dues = customer.stats?.totalDuesPaisa || 0;
                return (
                  <tr
                    key={customer._id.toString()}
                    className="border-t hover:bg-[#faf9f6] cursor-pointer"
                    onClick={() => router.push(`/customers/${customer._id}`)}
                  >
                    <td className="px-5 py-3.5 font-semibold">
                      <Link
                        href={`/customers/${customer._id}`}
                        className="text-[#c9963e] hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        {customer.name || "Unknown"}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      {customer.mobile && <div className="font-mono text-xs">{customer.mobile}</div>}
                      {customer.email && <div className="text-xs text-[#706a61]">{customer.email}</div>}
                      {customer.gstin && <div className="text-[10px] text-[#9b7740] font-mono mt-0.5">GST: {customer.gstin}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold">{customer.stats?.totalOrders || 0}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-[#1a6b3a] font-financial">
                      {formatMoney(customer.stats?.totalSpentPaisa || 0)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-financial font-semibold">
                      {dues > 0 ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[#8a2f20] font-bold">
                            {formatMoney(dues)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#a09a8f] font-normal">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-[#9b7740] hover:text-[#7a5c2f] hover:bg-[#f5ede2]"
                          title="Start New Bill for Customer in POS"
                          onClick={() => router.push(`/billing?customerId=${customer._id}`)}
                        >
                          <Receipt size={14} />
                        </Button>
                        {dues > 0 && (
                          <SettleDuesModal
                            customer={customer}
                            onSuccess={() => {
                              // Reload customer
                              router.refresh();
                            }}
                          />
                        )}
                        <EditCustomerButton customer={customer} iconOnly={true} />
                        <DeleteCustomerButton customerId={customer._id.toString()} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCustomerAdded={(newCustomer) => {
          setCustomers(prev => [newCustomer, ...prev]);
        }}
      />
    </>
  );
}
