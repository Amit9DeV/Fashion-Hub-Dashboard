"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/src/services/api";

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    storeName: "Fashion Hub",
    tagline: "Premium Men's Fashion",
    gstin: "",
    taxRate: 5,
    invoiceFooter: "Thank you for shopping with us!",
    invoicePreferences: {}
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.settings.get()
      .then((payload) => {
        if (payload?.settings) {
          setSettings({
            ...payload.settings,
            gstin: payload.settings.gstin || "",
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.settings.update(settings);
      router.refresh();
      setMessage({ type: "success", text: "Settings saved successfully!" });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-sm text-[#706a61]">Loading settings...</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <section className="border-b border-[#dfd8cc] pb-6">
        <p className="eyebrow flex items-center gap-2" style={{ color: '#1a3a7a' }}>
          <span style={{ width: 16, height: 1, background: '#1a3a7a', display: 'inline-block' }} />
          Configuration
        </p>
        <h2 className="page-headline mt-2 text-2xl sm:text-3xl md:text-4xl">
          System Settings
        </h2>
      </section>

      {message && (
        <div className={`p-4 rounded-md text-sm ${message.type === 'success' ? 'bg-[#f0f9f4] text-[#1a6b3a] border border-[#a3d9b8]' : 'bg-[#fff4f0] text-[#8a2a1a] border border-[#f0b0a0]'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-md border bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Store Details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="storeName" className="text-sm font-medium">Store Name *</label>
              <Input id="storeName" name="storeName" required value={settings.storeName} onChange={e => setSettings({...settings, storeName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label htmlFor="tagline" className="text-sm font-medium">Tagline</label>
              <Input id="tagline" name="tagline" value={settings.tagline} onChange={e => setSettings({...settings, tagline: e.target.value})} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="gstin" className="text-sm font-medium">Store GSTIN</label>
              <Input 
                id="gstin" 
                name="gstin" 
                placeholder="e.g. 29ABCDE1234F1Z5" 
                value={settings.gstin} 
                onChange={e => setSettings({...settings, gstin: e.target.value.toUpperCase()})} 
              />
              <p className="text-xs text-[#8a847a]">Displayed on printed tax invoices and receipts.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Billing & Tax</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="taxRate" className="text-sm font-medium">Default Tax Rate (%)</label>
              <Input id="taxRate" name="taxRate" type="number" step="0.1" required value={settings.taxRate} onChange={e => setSettings({...settings, taxRate: parseFloat(e.target.value) || 0})} />
            </div>
            <div className="space-y-2">
              <label htmlFor="invoiceFooter" className="text-sm font-medium">Invoice Footer Message</label>
              <Input id="invoiceFooter" name="invoiceFooter" value={settings.invoiceFooter} onChange={e => setSettings({...settings, invoiceFooter: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Invoice Customization</h3>
          <p className="text-sm text-gray-500">Toggle what information appears on your generated invoice PDFs.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { id: "showStoreContact", label: "Store Contact & Socials" },
              { id: "showGstin", label: "GSTIN" },
              { id: "showCustomerDetails", label: "Customer Name & Mobile" },
              { id: "showTaxBreakdown", label: "Tax Breakdown (CGST/SGST)" },
              { id: "showVariantInfo", label: "Variant Colors & Sizes" },
              { id: "showTrustBadges", label: "Trust Badges" },
              { id: "showPolicyText", label: "Exchange Policy Text" }
            ].map(pref => (
              <label key={pref.id} className="flex items-center space-x-3 rounded border p-3 cursor-pointer hover:bg-gray-50">
                <input 
                  type="checkbox" 
                  className="h-4 w-4 rounded border-gray-300 text-[#9b7740] focus:ring-[#9b7740]"
                  checked={settings.invoicePreferences?.[pref.id] ?? true}
                  onChange={(e) => setSettings({
                    ...settings,
                    invoicePreferences: {
                      ...(settings.invoicePreferences || {}),
                      [pref.id]: e.target.checked
                    }
                  })}
                />
                <span className="text-sm font-medium text-gray-700">{pref.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="gold" type="submit" disabled={saving} className="w-full sm:w-auto">{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </form>

    </div>
  );
}
