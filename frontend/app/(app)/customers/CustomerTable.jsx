"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/utils";
import DeleteCustomerButton from "@/components/customers/DeleteCustomerButton";
import { UsersRound } from "lucide-react";

export default function CustomerTable({ customers }) {
  const router = useRouter();

  if (!customers || customers.length === 0) {
    return (
      <div className="grid min-h-48 place-items-center p-6 text-center">
        <div>
          <UsersRound className="mx-auto text-[#c9963e]" size={24} />
          <p className="mt-3 text-sm text-[#706a61]">No customers found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-[#81796d]">
          <tr>
            <th className="px-5 py-3 font-semibold">Name</th>
            <th className="px-5 py-3 font-semibold">Contact</th>
            <th className="px-5 py-3 font-semibold text-right">Orders</th>
            <th className="px-5 py-3 font-semibold text-right">Total Spent</th>
            <th className="px-5 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
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
                {customer.mobile && <div>{customer.mobile}</div>}
                {customer.email && <div className="text-xs text-[#706a61]">{customer.email}</div>}
              </td>
              <td className="px-5 py-3.5 text-right font-semibold">{customer.stats?.totalOrders || 0}</td>
              <td className="px-5 py-3.5 text-right font-semibold text-[#1a6b3a] font-financial">
                {formatMoney(customer.stats?.totalSpentPaisa || 0)}
              </td>
              <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-end">
                  <DeleteCustomerButton customerId={customer._id.toString()} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
