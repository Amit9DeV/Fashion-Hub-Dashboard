"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

export default function DeleteOrderButton({ orderId }) {
  const router = useRouter();

  function handleReturn() {
    router.push(`/returns?orderId=${encodeURIComponent(orderId)}`);
  }

  return (
    <button 
      onClick={handleReturn}
      className="text-[#8a5a10] hover:text-[#5d3c0b] transition-colors p-1"
      title="Record a return or exchange"
    >
      <RotateCcw size={16} />
    </button>
  );
}
