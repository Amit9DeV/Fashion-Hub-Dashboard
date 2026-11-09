"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, Shield, Lock, Mail, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/src/services/api";
import { toast } from "sonner";

export default function AddStaffButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "CASHIER",
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "CASHIER",
      });
      setError("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError("Name, email, and password are required.");
      return;
    }
    if (formData.password.length < 12 || new TextEncoder().encode(formData.password).length > 72) {
      setError("Password must be at least 12 characters and no more than 72 UTF-8 bytes.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await api.staff.create(formData);
      toast.success("Staff member created successfully");
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      setError(err.message || "Failed to create staff member");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="gold"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <UserPlus size={16} />
        Add Staff Member
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden border border-[#e8e3da] flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b bg-[#faf9f6] px-6 py-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-full bg-[#fdf8f0] border border-[#e6c97a] flex items-center justify-center text-[#8a5a10]">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-[#0b0b0b]">Add Team Member</h3>
                  <p className="text-xs text-[#706a61]">Assign workspace access & roles</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#8a847a] hover:text-[#0b0b0b] transition-colors p-1"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
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
                    placeholder="e.g. Ramesh Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-2.5 text-[#8a847a]" />
                  <Input
                    type="email"
                    className="pl-9 h-9 text-xs"
                    placeholder="ramesh@fashionhub.local"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                      placeholder="9876543210"
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

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                  Password *
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-2.5 text-[#8a847a]" />
                  <Input
                    type="password"
                    className="pl-9 h-9 text-xs"
                    placeholder="Minimum 12 characters; maximum 72 bytes"
                    minLength={12}
                    maxLength={72}
                    minLength={12}
                    maxLength={128}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
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
                  {busy ? "Saving..." : "Create Account"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
