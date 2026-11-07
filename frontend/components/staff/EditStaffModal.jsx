"use client";

import { useState, useEffect } from "react";
import { X, Shield, Phone, User, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/src/services/api";
import { toast } from "sonner";

export default function EditStaffModal({ isOpen, onClose, staff, onStaffUpdated }) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    role: "CASHIER",
    active: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (staff && isOpen) {
      setFormData({
        name: staff.name || "",
        phone: staff.phone || "",
        role: staff.role || "CASHIER",
        active: staff.active !== undefined ? staff.active : true,
      });
      setError("");
    }
  }, [staff, isOpen]);

  if (!isOpen || !staff) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Name is required.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const res = await api.staff.update(staff._id, formData);
      toast.success("Staff member updated successfully");
      onStaffUpdated?.(res.staff || { ...staff, ...formData });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update staff member");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden border border-[#e8e3da]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b bg-[#faf9f6] px-6 py-4">
          <div>
            <h3 className="font-semibold text-base text-[#0b0b0b]">Edit Team Member</h3>
            <p className="text-xs text-[#706a61] mt-0.5">{staff.email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#8a847a] hover:text-[#0b0b0b] transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-md border border-[#e0ae9f] bg-[#fff4f0] p-3 text-xs text-[#852c21]">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
              Full Name *
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-2.5 text-[#8a847a]" />
              <Input
                className="pl-9 h-9 text-xs"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                Phone
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-2.5 text-[#8a847a]" />
                <Input
                  type="tel"
                  className="pl-9 h-9 text-xs"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                Role *
              </label>
              <div className="relative">
                <Shield size={15} className="absolute left-3 top-2.5 text-[#8a847a]" />
                <select
                  className="w-full h-9 rounded-md border border-[#e8e3da] bg-white pl-9 pr-3 text-xs outline-none focus:border-[#c9963e]"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="CASHIER">CASHIER (Counter Sale)</option>
                  <option value="MANAGER">MANAGER (Inventory/POS)</option>
                  <option value="ADMIN">ADMIN (Full Access)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#f0ede7]">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="size-4 accent-[#c9963e] rounded"
              />
              <div>
                <p className="text-xs font-semibold text-[#0b0b0b]">Account Active</p>
                <p className="text-[11px] text-[#706a61]">
                  Inactive staff cannot log into the workspace
                </p>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={busy}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gold"
              size="sm"
              disabled={busy}
              className="h-8 text-xs px-5"
            >
              {busy ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
