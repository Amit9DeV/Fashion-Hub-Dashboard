import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { serverFetch } from "@/lib/server-api";
import { SearchInput } from "@/components/ui/SearchInput";
import OrdersTable from "./OrdersTable";
import DateFilter from "./DateFilter";

export const dynamic = "force-dynamic";

export default async function OrdersPage(props) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q || searchParams?.query || "";
  const page = parseInt(searchParams?.page, 10) || 1;
  const startDate = searchParams?.startDate || "";
  const endDate = searchParams?.endDate || "";
  const paymentMethod = searchParams?.paymentMethod || "ALL";
  const dueStatus = searchParams?.dueStatus || "ALL";
  const status = searchParams?.status || "ALL";
  
  const queryStr = `/orders?query=${encodeURIComponent(q)}&page=${page}&limit=25${
    startDate ? `&startDate=${encodeURIComponent(startDate)}` : ""
  }${endDate ? `&endDate=${encodeURIComponent(endDate)}` : ""}${
    paymentMethod && paymentMethod !== "ALL" ? `&paymentMethod=${encodeURIComponent(paymentMethod)}` : ""
  }${dueStatus && dueStatus !== "ALL" ? `&dueStatus=${encodeURIComponent(dueStatus)}` : ""}${
    status && status !== "ALL" ? `&status=${encodeURIComponent(status)}` : ""
  }`;
  
  const res = await serverFetch(queryStr);
  if (res.status === 401) {
    redirect("/login");
  }
  
  const payload = await res.json().catch(() => ({}));
  const dataObj = payload.data || payload || {};
  const { orders = [], invoices = [], messages = [], pagination = {} } = dataObj;

  return (
    <div className="overflow-hidden rounded-md border bg-white shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b px-4 sm:px-6 py-5 gap-4">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <span style={{ width: 16, height: 1, background: '#5a2a7a', display: 'inline-block' }} />
            Immutable sales ledger
          </p>
          <h2 className="page-headline mt-2 text-2xl sm:text-3xl md:text-4xl">
            Completed orders
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#756e64]" style={{ fontFamily: "'Inter', sans-serif" }}>Sales ledger with historical records.</p>
        </div>
        <div className="flex flex-col gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <div className="flex-1 sm:w-64">
              <SearchInput placeholder="Search invoice or customer..." />
            </div>
            <span className="hidden rounded-full bg-[#f0ede7] px-3 py-1 text-xs font-semibold text-[#5f584e] sm:block shrink-0">
              {pagination.total !== undefined ? `${pagination.total} total` : `${orders.length} orders`}
            </span>
          </div>
          <DateFilter
            startDate={startDate}
            endDate={endDate}
            paymentMethod={paymentMethod}
            dueStatus={dueStatus}
            status={status}
          />
        </div>
      </div>
      {orders.length ? (
        <OrdersTable 
          orders={orders} 
          invoices={invoices} 
          messages={messages} 
          pagination={pagination}
          currentQuery={q}
          startDate={startDate}
          endDate={endDate}
        />
      ) : (
        <div className="grid min-h-72 place-items-center p-6 text-center">
          <div>
            <FileText className="mx-auto text-[#c9963e]" size={28} />
            <p className="mt-3 text-sm font-medium">No completed orders found</p>
            <p className="text-xs text-[#8a847a] mt-1">{q ? `No results for "${q}"` : startDate || endDate ? "No orders in the selected date range." : "Sales will appear here once processed at POS."}</p>
            <Link href="/billing" className="mt-3 inline-block text-xs font-semibold text-[#805f2b] underline">Start a counter sale</Link>
          </div>
        </div>
      )}
    </div>
  );
}

