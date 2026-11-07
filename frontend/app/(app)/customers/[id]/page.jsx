import Link from "next/link";
import { formatMoney, formatDate } from "@/lib/utils";
import { serverFetch } from "@/lib/server-api";
import { redirect } from "next/navigation";
import { FileText, AlertCircle, ArrowLeft, MapPin, MessageCircle, HandCoins } from "lucide-react";
import EditCustomerButton from "@/components/customers/EditCustomerButton";
import DeleteCustomerButton from "@/components/customers/DeleteCustomerButton";
import SettleDuesModal from "@/components/customers/SettleDuesModal";
import CustomerOrderHistoryTable from "@/components/customers/CustomerOrderHistoryTable";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage(props) {
  const params = await props.params;
  const res = await serverFetch(`/customers/${params.id}`);
  if (res.status === 401) {
    redirect("/login");
  }
  
  const payload = await res.json().catch(() => ({}));
  if (!payload.success || !payload.data?.customer) redirect("/customers");
  
  const { customer, orders = [] } = payload.data;
  const duesPaisa = customer.stats?.totalDuesPaisa || 0;

  // Format customer address
  const addressParts = typeof customer.address === "object" && customer.address !== null
    ? [customer.address.line1, customer.address.city, customer.address.postalCode].filter(Boolean)
    : (customer.address ? [customer.address] : []);
  const formattedAddress = addressParts.join(", ");

  // Format phone for WhatsApp
  const rawPhone = customer.whatsappNumber || customer.mobile || "";
  const phoneDigits = rawPhone.replace(/\D/g, "");
  const waPhone = phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;
  const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(`Hello ${customer.name || ""}, Greetings from Fashion Hub!`)}` : null;
  const duesReminderText = duesPaisa > 0
    ? `Dear ${customer.name || "Customer"},\n\nGreetings from Fashion Hub! This is a gentle reminder regarding your outstanding bill balance of ${formatMoney(duesPaisa)}. Kindly settle at your earliest convenience.\n\nThank you!`
    : "";
  const duesWaUrl = waPhone && duesPaisa > 0
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(duesReminderText)}`
    : null;

  return (
    <div className="space-y-7">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9b7740] hover:text-[#7a5c2f] transition-colors group"
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
          All Customers
        </Link>
      </div>

      <section className="border-b border-[#dfd8cc] pb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7740]">Customer Profile</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">{customer.name || "Unknown"}</h2>
          <div className="mt-2 text-sm text-[#706a61] flex flex-wrap gap-x-4 gap-y-1 items-center">
            {customer.mobile && <span>{customer.mobile}</span>}
            {customer.email && <span>{customer.email}</span>}
            {customer.gstin && <span>GSTIN: {customer.gstin}</span>}
          </div>
          {formattedAddress && (
            <div className="mt-1.5 text-xs text-[#8a847a] flex items-center gap-1.5">
              <MapPin size={13} className="text-[#9b7740] shrink-0" />
              <span>{formattedAddress}</span>
            </div>
          )}
        </div>
        <div className="w-full sm:w-auto flex flex-wrap gap-2.5 justify-start sm:justify-end items-center">
          {duesWaUrl && (
            <Button variant="outline" asChild className="h-9 text-xs border-[#8a2f20]/40 text-[#8a2f20] hover:bg-[#ffebe6] gap-1.5 font-medium">
              <a href={duesWaUrl} target="_blank" rel="noopener noreferrer">
                <HandCoins size={14} className="text-[#8a2f20]" />
                Remind Dues
              </a>
            </Button>
          )}
          {waUrl && !duesWaUrl && (
            <Button variant="outline" asChild className="h-9 text-xs border-[#25D366]/40 text-[#128C7E] hover:bg-[#25D366]/10 gap-1.5">
              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={14} className="text-[#25D366]" />
                WhatsApp
              </a>
            </Button>
          )}
          <SettleDuesModal customer={customer} />
          <Button variant="gold" asChild className="h-9 text-xs">
            <Link href={`/billing?customerId=${customer._id}`}>
              + New Sale
            </Link>
          </Button>
          <EditCustomerButton customer={customer} />
          <DeleteCustomerButton customerId={customer._id} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#7b7367]">Total Orders</p>
          <p className="font-financial mt-4 text-2xl font-semibold">{customer.stats?.totalOrders || 0}</p>
        </div>
        <div className="rounded-md border bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#7b7367]">Total Spent</p>
          <p className="font-financial mt-4 text-2xl font-semibold text-[#1a6b3a]">{formatMoney(customer.stats?.totalSpentPaisa || 0)}</p>
        </div>
        <div className="rounded-md border bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#7b7367]">Avg Order Value</p>
          <p className="font-financial mt-4 text-2xl font-semibold">
            {formatMoney(
              customer.stats?.averageOrderValuePaisa || 
              (customer.stats?.totalOrders ? Math.round(customer.stats.totalSpentPaisa / customer.stats.totalOrders) : 0)
            )}
          </p>
        </div>
        <div className={`rounded-md border p-5 ${duesPaisa > 0 ? "border-[#f5c6cb] bg-[#fff8f7]" : "bg-white"}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#7b7367]">Outstanding Dues</p>
            {duesPaisa > 0 && <span className="rounded bg-[#ffebe6] px-1.5 py-0.5 text-[10px] font-bold text-[#8a2f20]">ACTION REQUIRED</span>}
          </div>
          <p className={`font-financial mt-4 text-2xl font-semibold ${duesPaisa > 0 ? "text-[#8a2f20]" : "text-[#706a61]"}`}>
            {formatMoney(duesPaisa)}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-md border bg-white">
        <div className="border-b px-5 py-4">
          <h3 className="font-semibold">Order History</h3>
        </div>
        <CustomerOrderHistoryTable orders={orders} customer={customer} />
      </section>
    </div>
  );
}

