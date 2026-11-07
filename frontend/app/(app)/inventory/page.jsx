import { redirect } from "next/navigation";
import { serverFetch } from "@/lib/server-api";
import Link from "next/link";
import { SearchInput } from "@/components/ui/SearchInput";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import InventoryTable from "./InventoryTable";

export const dynamic = "force-dynamic";

export default async function InventoryPage(props) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q || "";
  const res = await serverFetch(`/inventory${q ? `?query=${encodeURIComponent(q)}` : ""}`);
  if (res.status === 401) {
    redirect("/login");
  }

  const payload = await res.json().catch(() => ({}));
  const variants = payload.data?.variants || [];

  return (
    <div className="space-y-7 pb-10">
      {/* ── Header ── */}
      <section className="flex flex-col justify-between gap-4 border-b border-[#dfd8cc] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow flex items-center gap-2" style={{ color: "#8a1a1a" }}>
            <span style={{ width: 16, height: 1, background: "#8a1a1a", display: "inline-block" }} />
            Stock Control
          </p>
          <h2 className="page-headline mt-2 text-2xl sm:text-3xl md:text-4xl">
            Inventory
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#756e64]">
            Live stock levels, status filters, and instant stock adjustments.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <Button variant="gold" asChild className="justify-center shrink-0">
            <Link href="/products/new">
              <Plus size={16} className="mr-2" /> Add Product
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Interactive Inventory Table & Stock Adjustment ── */}
      <InventoryTable
        initialVariants={variants}
        searchComponent={<SearchInput placeholder="Search by SKU, name, or colour..." />}
      />

      <p className="text-xs text-center text-[#9c9489]">
        Stock decreases automatically with each completed POS sale, and replenishes on quick stock adjust or returns.
      </p>
    </div>
  );
}

