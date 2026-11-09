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
    if (!confirm("Archive this customer and remove their contact details? Historical sales records will be preserved.")) return;

    setDeleting(true);
    try {
      await api.customers.delete(customerId);
      toast.success("Customer archived");
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
      title="Archive customer"
    >
      <Trash2 size={16} />
    </button>
  );
}
