import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const user = await getCurrentUser();
  if (user.role !== "ADMIN") redirect("/dashboard");

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/staff`, { 
    cache: 'no-store',
    headers: { 'Cookie': `fashion_hub_session=${user.token || ""}` }
  });
  
  const payload = await res.json().catch(() => ({}));
  const staff = payload.data?.staff || [];

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 border-b border-[#dfd8cc] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7740]">Team</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Staff Members</h2>
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
                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${member.active ? 'bg-[#e6f4ea] text-[#1e8e3e]' : 'bg-[#fce8e6] text-[#d93025]'}`}>
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
