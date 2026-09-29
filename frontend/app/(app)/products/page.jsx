import Link from "next/link";
import { Plus } from "lucide-react";
import { apiBase } from "@/lib/backend";
import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import { SearchInput } from "@/components/ui/SearchInput";
import ProductTable from "./ProductTable";

export const dynamic = "force-dynamic";

export default async function ProductsPage(props) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q || "";
  const cookieStore = await cookies();
  const res = await fetch(`${apiBase()}/products/all?query=${encodeURIComponent(q)}`, {
    cache: 'no-store',
    headers: { cookie: cookieStore.toString() },
  });
  
  const payload = await res.json().catch(() => ({}));
  const products = payload.data?.products || [];

  return (
    <div className="space-y-7 pb-10">
      <section className="flex flex-col justify-between gap-4 border-b border-[#dfd8cc] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow flex items-center gap-2" style={{ color: '#8a5a10' }}>
            <span style={{ width: 16, height: 1, background: '#8a5a10', display: 'inline-block' }} />
            Product Catalog
          </p>
          <h2 className="page-headline" style={{ marginTop: 10, fontSize: 36 }}>
            Manage your items
          </h2>
        </div>
        <div className="flex gap-3">
          <Button variant="gold" asChild>
            <Link href="/products/new">
              Add Product <Plus size={17} className="ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      <ProductTable 
        initialProducts={products} 
        searchComponent={<SearchInput placeholder="Search products by name, SKU, or category..." />} 
      />
    </div>
  );
}
