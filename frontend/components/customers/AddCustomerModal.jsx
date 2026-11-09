"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/src/services/api";

export default function AddCustomerModal({ isOpen, onClose, onCustomerAdded }) {
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    whatsappNumber: "",
    email: "",
    gstin: "",
    address: "",
    city: "",
    postalCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: "",
        mobile: "",
        whatsappNumber: "",
        email: "",
        gstin: "",
        address: "",
        city: "",
        postalCode: "",
      });
      setError("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() && !formData.mobile.trim()) {
      setError("Please enter at least a name or mobile number.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const data = await api.customers.create({
        name: formData.name.trim() || undefined,
        mobile: formData.mobile.trim() || undefined,
        whatsappNumber: formData.whatsappNumber.trim() || formData.mobile.trim() || undefined,
        email: formData.email.trim() || undefined,
        gstin: formData.gstin.trim() || undefined,
        address: formData.address.trim() || formData.city.trim() ? {
          line1: formData.address.trim(),
          city: formData.city.trim(),
          postalCode: formData.postalCode.trim(),
        } : undefined,
      });
      onCustomerAdded?.(data.customer);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto animate-modal-pop">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#151515]">Add Customer</h2>
            <p className="text-xs text-[#8a847a] mt-0.5">Register a new customer in the system</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-black text-lg">✕</button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-[#fff4f0] border border-[#f0b0a0] px-3 py-2 text-sm text-[#8a2a1a]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#5f584e]">Full Name *</label>
            <Input
              placeholder="e.g. Ravi Kumar"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#5f584e]">Mobile Number *</label>
            <Input
              type="tel"
              placeholder="e.g. 9876543210"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#5f584e]">WhatsApp Number <span className="text-[#8a847a] font-normal">(if different)</span></label>
            <Input
              type="tel"
              placeholder="Leave blank to use mobile number"
              value={formData.whatsappNumber}
              onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#5f584e]">Email Address <span className="text-[#8a847a] font-normal">(optional)</span></label>
            <Input
              type="email"
              placeholder="e.g. ravi@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#5f584e]">GSTIN <span className="text-[#8a847a] font-normal">(for GST invoices)</span></label>
            <Input
              placeholder="e.g. 29ABCDE1234F1Z5"
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#5f584e]">Street Address <span className="text-[#8a847a] font-normal">(optional)</span></label>
            <Input
              placeholder="e.g. Main Market, Near Clock Tower"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#5f584e]">City / Town</label>
              <Input
                placeholder="e.g. Mairwa"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#5f584e]">Postal PIN Code</label>
              <Input
                placeholder="e.g. 841437"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-2 border-t border-[#f0ede7]">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" disabled={loading}>
              {loading ? "Creating..." : "Add Customer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
