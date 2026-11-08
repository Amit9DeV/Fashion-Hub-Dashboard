import { redirect } from "next/navigation";
import { serverFetch } from "@/lib/server-api";
import { PricingEditor } from "@/features/pricing/PricingEditor";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  // We use the existing getAllProducts API which includes product.variants due to aggregation
  const res = await serverFetch("/products/all");
  if (res.status === 401) {
    redirect("/login");
  }
  
  const payload = await res.json().catch(() => ({}));
  const products = payload.data?.products || payload.products || [];

  // Flatten to a single list of variants, attaching product context to each variant
  const variants = products.flatMap(product => 
    (product.variants || []).map(variant => ({
      ...variant,
      // Stringify MongoDB ObjectIds to plain strings for safe serialization
      // across the server→client component boundary
      _id: variant._id?.toString(),
      productId: variant.productId?.toString() || product._id?.toString(),
      productName: product.name,
      productBrand: product.brandSnapshot,
      productCategory: product.categorySnapshot,
      productStatus: product.status
    }))
  );

  return (
    <div className="space-y-7 pb-10">
      <section className="flex flex-col justify-between gap-4 border-b border-[#dfd8cc] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow flex items-center gap-2" style={{ color: '#8a5a10' }}>
            <span style={{ width: 16, height: 1, background: '#8a5a10', display: 'inline-block' }} />
            Pricing Management
          </p>
          <h2 className="page-headline" style={{ marginTop: 10, fontSize: 36 }}>
            Bulk Editor
          </h2>
        </div>
      </section>
      <PricingEditor initialVariants={variants} />
    </div>
  );
}
