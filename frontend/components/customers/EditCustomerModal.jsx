import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function EditCustomerModal({ isOpen, onClose, customer, onUpdate }) {
  const [formData, setFormData] = useState({
    name: customer?.name || "",
    mobile: customer?.mobile || "",
    email: customer?.email || "",
    gstin: customer?.gstin || "",
    address: customer?.address?.line1 || (typeof customer?.address === "string" ? customer.address : "") || "",
    city: customer?.address?.city || "",
    postalCode: customer?.address?.postalCode || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sync form whenever the customer prop changes (e.g. editing a different customer)
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        mobile: customer.mobile || "",
        email: customer.email || "",
        gstin: customer.gstin || "",
        address: customer.address?.line1 || (typeof customer.address === "string" ? customer.address : "") || "",
        city: customer.address?.city || "",
        postalCode: customer.address?.postalCode || "",
      });
      setError("");
    }
  }, [customer]);

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
    setLoading(true);
    setError("");

    try {
      const payload = {
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email,
        gstin: formData.gstin,
        address: {
          line1: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
        },
      };
      await onUpdate(payload);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Edit Customer</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            ✕
          </button>
        </div>

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full Name</label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Mobile Number</label>
            <Input
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email Address</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">GSTIN (Optional)</label>
            <Input
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Street Address (Optional)</label>
            <Input
              placeholder="e.g. Main Market, Near Clock Tower"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">City / Town</label>
              <Input
                placeholder="e.g. Mairwa"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Postal PIN Code</label>
              <Input
                placeholder="e.g. 841437"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
