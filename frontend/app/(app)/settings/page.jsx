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
    taxRate: 5,
    invoiceFooter: "Thank you for shopping with us!"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/settings`, { credentials: "omit" })
      // actually api.js is better if we add get to it, but fetch is fine
      .then(res => res.json())
      .then(payload => {
        if (payload.data?.settings) setSettings(payload.data.settings);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.settings.update(settings);
      router.refresh();
      alert("Settings saved!");
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading settings...</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <section className="border-b border-[#dfd8cc] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7740]">Configuration</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">System Settings</h2>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-md border bg-white p-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Store Details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="storeName" className="text-sm font-medium">Store Name</label>
              <Input id="storeName" name="storeName" required value={settings.storeName} onChange={e => setSettings({...settings, storeName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label htmlFor="tagline" className="text-sm font-medium">Tagline</label>
              <Input id="tagline" name="tagline" value={settings.tagline} onChange={e => setSettings({...settings, tagline: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Billing & Tax</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="taxRate" className="text-sm font-medium">Default Tax Rate (%)</label>
              <Input id="taxRate" name="taxRate" type="number" step="0.1" required value={settings.taxRate} onChange={e => setSettings({...settings, taxRate: parseFloat(e.target.value)})} />
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
              { id: "showVariantInfo", label: "Variant Colors & Sizes" },
              { id: "showTrustBadges", label: "Trust Badges (e.g. 100% Original)" },
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
          <Button variant="gold" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </form>

    </div>
  );
}
