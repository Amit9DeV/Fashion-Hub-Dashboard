import { apiBase } from "@/lib/backend";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const cookieStore = await cookies();
  const res = await fetch(`${apiBase()}/staff`, {
    cache: 'no-store',
    headers: { cookie: cookieStore.toString() },
  });
  
  const payload = await res.json().catch(() => ({}));
  const staff = payload.data?.staff || [];

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 border-b border-[#dfd8cc] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow flex items-center gap-2" style={{ color: '#1a3a7a' }}>
            <span style={{ width: 16, height: 1, background: '#1a3a7a', display: 'inline-block' }} />
            Team
          </p>
          <h2 className="page-headline" style={{ marginTop: 10, fontSize: 36 }}>
            Staff Members
          </h2>
        </div>
        <Button variant="gold" disabled>
          Add Staff (Soon)
        </Button>
      </section>

      <section className="overflow-hidden rounded-md border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-[#81796d]">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member._id.toString()} className="border-t hover:bg-[#faf9f6]">
                  <td className="px-5 py-3.5 font-semibold">
                    <div className="flex items-center gap-2">
                      {member.role === "ADMIN" && <ShieldCheck size={14} className="text-[#c9963e]" />}
                      {member.name}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs">{member.email}</td>
                  <td className="px-5 py-3.5">
                    <span className="rounded bg-[#f0ede7] px-2 py-1 text-[10px] font-semibold tracking-wider text-[#5f584e]">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${member.active ? 'bg-[#f0f9f4] text-[#1a6b3a]' : 'bg-[#fef0f0] text-[#8a1a1a]'}`}>
                      {member.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
