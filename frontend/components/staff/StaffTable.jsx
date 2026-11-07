"use client";

import { useState } from "react";
import { ShieldCheck, Edit2, CheckCircle2, XCircle, Users } from "lucide-react";
import EditStaffModal from "./EditStaffModal";
import { api } from "@/src/services/api";
import { toast } from "sonner";

export default function StaffTable({ initialStaff }) {
  const [staff, setStaff] = useState(initialStaff || []);
  const [editingStaff, setEditingStaff] = useState(null);

  const roleColors = {
    ADMIN: "bg-[#fdf8f0] text-[#8a5a10] border border-[#e6c97a]",
    MANAGER: "bg-[#f0f4fc] text-[#1a3a7a] border border-[#b0c0e8]",
    CASHIER: "bg-[#f0f9f4] text-[#1a6b3a] border border-[#a0d0b8]",
    STAFF: "bg-[#faf9f6] text-[#5f584e] border border-[#dfd8cc]",
  };

  const handleToggleActive = async (member) => {
    const newStatus = !member.active;
    try {
      await api.staff.update(member._id, { active: newStatus });
      setStaff(prev => prev.map(s => s._id === member._id ? { ...s, active: newStatus } : s));
      toast.success(`${member.name} marked as ${newStatus ? 'Active' : 'Inactive'}`);
    } catch (err) {
      toast.error(err.message || "Failed to update staff status");
    }
  };

  if (staff.length === 0) {
    return (
      <div className="grid min-h-[300px] place-items-center p-6 text-center">
        <div>
          <Users className="mx-auto text-[#c9963e]" size={28} />
          <p className="mt-3 text-sm font-medium text-[#5f584e]">No staff members yet</p>
          <p className="mt-1 text-xs text-[#8a847a] max-w-xs mx-auto">
            Add staff members to track who processed each sale and manage access levels.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-[#81796d]">
            <tr>
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Email</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold text-center">Status</th>
              <th className="px-5 py-3 font-semibold text-right">Joined</th>
              <th className="px-5 py-3 font-semibold text-right">Actions</th>
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
                  <button
                    type="button"
                    onClick={() => handleToggleActive(member)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-opacity hover:opacity-80 ${member.active ? "bg-[#f0f9f4] text-[#1a6b3a]" : "bg-[#fef0f0] text-[#8a1a1a]"}`}
                    title="Click to toggle status"
                  >
                    {member.active ? (
                      <><CheckCircle2 size={11} /> Active</>
                    ) : (
                      <><XCircle size={11} /> Inactive</>
                    )}
                  </button>
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
                <td className="px-5 py-3.5 text-right">
                  <button
                    type="button"
                    onClick={() => setEditingStaff(member)}
                    className="inline-flex items-center gap-1 rounded border border-[#dfd8cc] bg-white hover:bg-gray-100 px-2.5 py-1 text-xs font-medium text-[#5f584e] transition-colors"
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditStaffModal
        isOpen={!!editingStaff}
        onClose={() => setEditingStaff(null)}
        staff={editingStaff}
        onStaffUpdated={(updatedMember) => {
          setStaff(prev => prev.map(s => s._id === updatedMember._id ? updatedMember : s));
        }}
      />
    </>
  );
}
