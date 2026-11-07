import { redirect } from "next/navigation";
import { serverFetch } from "@/lib/server-api";
import AddStaffButton from "@/components/staff/AddStaffButton";
import StaffTable from "@/components/staff/StaffTable";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const res = await serverFetch("/staff");
  if (res.status === 401) {
    redirect("/login");
  }

  const payload = await res.json().catch(() => ({}));
  const staff = payload.data?.staff || [];

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 border-b border-[#dfd8cc] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow flex items-center gap-2" style={{ color: "#1a3a7a" }}>
            <span style={{ width: 16, height: 1, background: "#1a3a7a", display: "inline-block" }} />
            Team Management
          </p>
          <h2 className="page-headline mt-2 text-2xl sm:text-3xl md:text-4xl">
            Staff Members
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#756e64]">
            Manage roles, access levels, and account status.
          </p>
        </div>
        <div className="w-full sm:w-auto flex justify-start sm:justify-end">
          <AddStaffButton />
        </div>
      </section>

      <section className="overflow-hidden rounded-md border bg-white shadow-sm">
        <StaffTable initialStaff={staff} />
      </section>
    </div>
  );
}

