import { redirect } from "next/navigation";
import { serverFetch } from "@/lib/server-api";
import { ShieldCheck, Users, UserPlus } from "lucide-react";
import AddStaffButton from "@/components/staff/AddStaffButton";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const res = await serverFetch("/staff");
  if (res.status === 401) {
    redirect("/login");
  }

  const payload = await res.json().catch(() => ({}));
  const staff = payload.data?.staff || [];

  const roleColors = {
    ADMIN: "bg-[#fdf8f0] text-[#8a5a10] border border-[#e6c97a]",
    MANAGER: "bg-[#f0f4fc] text-[#1a3a7a] border border-[#b0c0e8]",
    CASHIER: "bg-[#f0f9f4] text-[#1a6b3a] border border-[#a0d0b8]",
    STAFF: "bg-[#faf9f6] text-[#5f584e] border border-[#dfd8cc]",
  };

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 border-b border-[#dfd8cc] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow flex items-center gap-2" style={{ color: "#1a3a7a" }}>
            <span style={{ width: 16, height: 1, background: "#1a3a7a", display: "inline-block" }} />
            Team Management
          </p>
          <h2 className="page-headline" style={{ marginTop: 10, fontSize: 36 }}>
            Staff Members
          </h2>
          <p className="mt-1 text-sm text-[#756e64]">
            {staff.length} active team member{staff.length !== 1 ? "s" : ""}
          </p>
        </div>
        <AddStaffButton />
      </section>

      <section className="overflow-hidden rounded-md border bg-white shadow-sm">
        {staff.length === 0 ? (
          <div className="grid min-h-[300px] place-items-center p-6 text-center">
            <div>
              <Users className="mx-auto text-[#c9963e]" size={28} />
              <p className="mt-3 text-sm font-medium text-[#5f584e]">No staff members yet</p>
              <p className="mt-1 text-xs text-[#8a847a] max-w-xs mx-auto">
                Add staff members to track who processed each sale and manage access levels.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-[#81796d]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold text-center">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ede7]">
                {staff.map((member) => (
                  <tr key={member._id.toString()} className="hover:bg-[#faf9f6] transition-colors">
                    <td className="px-5 py-3.5 font-semibold">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-full bg-[#f0ede7] flex items-center justify-center text-xs font-bold text-[#5f584e] uppercase shrink-0">
                          {(member.name || "?")[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-[#0b0b0b]">
                            {member.name}
                            {member.role === "ADMIN" && (
                              <ShieldCheck size={13} className="inline ml-1.5 text-[#c9963e]" />
                            )}
                          </p>
                          {member.phone && (
                            <p className="text-[11px] text-[#8a847a]">{member.phone}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#5f584e]">{member.email || "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${roleColors[member.role] || roleColors.STAFF}`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${member.active ? "bg-[#f0f9f4] text-[#1a6b3a]" : "bg-[#fef0f0] text-[#8a1a1a]"}`}>
                        {member.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-[#8a847a]">
                      {member.createdAt
                        ? new Date(member.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
