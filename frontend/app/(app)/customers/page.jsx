import Link from "next/link";
import { redirect } from "next/navigation";
import { UsersRound } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { serverFetch } from "@/lib/server-api";
import DeleteCustomerButton from "@/components/customers/DeleteCustomerButton";
import { SearchInput } from "@/components/ui/SearchInput";
import CustomerTable from "./CustomerTable";

export const dynamic = "force-dynamic";

export default async function CustomersPage(props) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q || "";
  const res = await serverFetch(`/customers/all?query=${encodeURIComponent(q)}`);
  if (res.status === 401) {
    redirect("/login");
  }
  
  const payload = await res.json().catch(() => ({}));
  const customers = payload.data?.customers || [];

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 border-b border-[#dfd8cc] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow flex items-center gap-2" style={{ color: '#1a5a5a' }}>
            <span style={{ width: 16, height: 1, background: '#1a5a5a', display: 'inline-block' }} />
            Clientele
          </p>
          <h2 className="page-headline" style={{ marginTop: 10, fontSize: 36 }}>
            Customers
          </h2>
        </div>
        <div className="flex w-full sm:w-auto gap-3 flex-1 justify-end max-w-sm">
          <SearchInput placeholder="Search by name, mobile, or whatsapp..." />
        </div>
      </section>

      <section className="overflow-hidden rounded-md border bg-white">
        <CustomerTable customers={customers} />
      </section>
    </div>
  );
}
