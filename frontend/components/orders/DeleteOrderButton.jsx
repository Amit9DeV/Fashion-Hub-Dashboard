"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { api } from "@/src/services/api";
import { toast } from "sonner";

export default function DeleteOrderButton({ orderId }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this order? This will also delete the associated invoice and restore the stock levels for the variants sold. This action cannot be undone.")) return;

    setDeleting(true);
    try {
      await api.orders.delete(orderId);
      toast.success("Order deleted and stock restored");
      router.refresh();
    } catch (err) {
      toast.error(err.message || "Failed to delete order");
      setDeleting(false);
    }
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={deleting}
      className="text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors p-1"
      title="Delete Order (Restore Stock)"
    >
      <Trash2 size={16} />
    </button>
  );
}
