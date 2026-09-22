"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { api } from "@/src/services/api";
import { toast } from "sonner";

export default function DeleteCustomerButton({ customerId }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this customer? This will remove them from the system. (Their past orders will remain in the ledger but will no longer be linked).")) return;

    setDeleting(true);
    try {
      await api.customers.delete(customerId);
      toast.success("Customer deleted successfully");
      router.refresh();
    } catch (err) {
      toast.error(err.message || "Failed to delete customer");
      setDeleting(false);
    }
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={deleting}
      className="text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors p-1"
      title="Delete Customer"
    >
      <Trash2 size={16} />
    </button>
  );
}
