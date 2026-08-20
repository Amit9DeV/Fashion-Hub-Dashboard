import { Suspense } from "react";
import { BillingPOS } from "@/features/billing/BillingPOS";

export const dynamic = "force-dynamic";

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#888]">Loading POS...</div>}>
      <BillingPOS />
    </Suspense>
  );
}
