"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/src/services/api";
import { toast } from "sonner";
import {
  Download,
  QrCode,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Database,
  Building,
  KeyRound,
  FileSpreadsheet,
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    storeName: "Fashion Hub",
    tagline: "Premium Men's Fashion",
    gstin: "",
    phone: "",
    address: "",
    upiId: "",
    taxRate: 5,
    invoiceFooter: "Thank you for shopping with us!",
    printFormat: "A4",
    lowStockThreshold: 5,
    invoicePreferences: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [showUpiPreview, setShowUpiPreview] = useState(false);

  // Password change state
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState(null);

  useEffect(() => {
    api.settings
      .get()
      .then((payload) => {
        if (payload?.settings) {
          setSettings({
            ...payload.settings,
            gstin: payload.settings.gstin || "",
            phone: payload.settings.phone || "",
            address: payload.settings.address || "",
            upiId: payload.settings.upiId || "",
            printFormat: payload.settings.printFormat || "A4",
            lowStockThreshold: payload.settings.lowStockThreshold || 5,
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
      toast.success("Settings updated!");
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Failed to save settings." });
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPwMessage(null);
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMessage({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (pwForm.newPassword.length < 12 || new TextEncoder().encode(pwForm.newPassword).length > 72) {
      setPwMessage({ type: "error", text: "New password must be at least 12 characters and no more than 72 UTF-8 bytes." });
      return;
    }
    setPwSaving(true);
    try {
      await api.auth.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success("Password changed. Sign in again with your new password.");
      router.replace("/login?passwordChanged=1");
    } catch (error) {
      setPwMessage({ type: "error", text: error.message || "Failed to change password." });
      toast.error(error.message || "Password change failed");
    } finally {
      setPwSaving(false);
    }
  }

  const handleExportData = async (type) => {
    try {
      if (type === "products") {
        const res = await api.products.getAll();
        const prods = res.products || [];
        const rows = [["Product Name", "Brand", "Category", "Variants Count", "Total Stock"]];
        prods.forEach((p) =>
          rows.push([
            `"${(p.name || "").replace(/"/g, '""')}"`,
            `"${(p.brandSnapshot || "").replace(/"/g, '""')}"`,
            `"${(p.categorySnapshot || "").replace(/"/g, '""')}"`,
            p.variantCount || 0,
            p.totalStock || 0,
          ])
        );
        downloadCsv(`fashion_hub_products_${Date.now()}.csv`, rows);
      } else if (type === "customers") {
        const res = await api.customers.getAll();
        const custs = res.customers || [];
        const rows = [["Name", "Mobile", "WhatsApp", "Total Orders", "Total Spent (Rs)", "Dues (Rs)"]];
        custs.forEach((c) =>
          rows.push([
            `"${(c.name || "").replace(/"/g, '""')}"`,
            `"${c.mobile || ""}"`,
            `"${c.whatsappNumber || ""}"`,
            c.stats?.totalOrders || 0,
            ((c.stats?.totalSpentPaisa || 0) / 100).toFixed(2),
            ((c.stats?.totalDuesPaisa || 0) / 100).toFixed(2),
          ])
        );
        downloadCsv(`fashion_hub_customers_${Date.now()}.csv`, rows);
      } else if (type === "orders") {
        const res = await api.orders.getAll(1, 200);
        const ords = res.orders || [];
        const rows = [["Invoice", "Date", "Customer", "Total (Rs)", "Due (Rs)", "Status"]];
        ords.forEach((o) =>
          rows.push([
            o.invoiceNumber,
            o.completedAt ? new Date(o.completedAt).toLocaleDateString() : "",
            `"${(o.customerSnapshot?.name || "Walk-in").replace(/"/g, '""')}"`,
            ((o.totalPaisa || 0) / 100).toFixed(2),
            ((o.duePaisa || 0) / 100).toFixed(2),
            o.status || "COMPLETED",
          ])
        );
        downloadCsv(`fashion_hub_orders_${Date.now()}.csv`, rows);
      } else if (type === "expenses") {
        const res = await api.expenses.getAll();
        const exps = res.expenses || [];
        const rows = [["Title", "Category", "Amount (Rs)", "Payment Method", "Date"]];
        exps.forEach((e) =>
          rows.push([
            `"${(e.title || "").replace(/"/g, '""')}"`,
            e.category || "OTHER",
            ((e.amountPaisa || 0) / 100).toFixed(2),
            e.paymentMethod || "CASH",
            e.date ? new Date(e.date).toLocaleDateString() : "",
          ])
        );
        downloadCsv(`fashion_hub_expenses_${Date.now()}.csv`, rows);
      }
    } catch (err) {
      toast.error("Failed to export: " + err.message);
    }
  };

  const downloadCsv = (filename, rows) => {
    const csvContent = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filename}!`);
  };

  if (loading) return <div className="p-8 text-sm text-[#706a61]">Loading settings...</div>;

  const testUpiUrl = settings.upiId
    ? `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(
        settings.storeName || "Fashion Hub"
      )}&am=100.00&cu=INR`
    : "";
  const upiQrPreviewSrc = testUpiUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(
        testUpiUrl
      )}`
    : "";

  return (
    <div className="mx-auto max-w-3xl space-y-7 pb-12">
      {/* ── Page Header ── */}
      <section className="border-b border-[#dfd8cc] pb-6">
        <p className="eyebrow flex items-center gap-2" style={{ color: "#1a3a7a" }}>
          <span style={{ width: 16, height: 1, background: "#1a3a7a", display: "inline-block" }} />
          Configuration
        </p>
        <h2 className="page-headline mt-2 text-2xl sm:text-3xl md:text-4xl">System Settings</h2>
        <p className="mt-1 text-xs sm:text-sm text-[#706a61]">
          Configure your retail brand identity, tax compliance, receipts, and security credentials.
        </p>
      </section>

      {message && (
        <div
          className={`p-4 rounded-md text-sm ${
            message.type === "success"
              ? "bg-[#f0f9f4] text-[#1a6b3a] border border-[#a3d9b8]"
              : "bg-[#fff4f0] text-[#8a2a1a] border border-[#f0b0a0]"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ── Store Details Form ── */}
      <form onSubmit={handleSubmit} className="space-y-6 rounded-md border bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
            <Building size={18} className="text-[#c9963e]" /> Store Details
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="storeName" className="text-sm font-medium">
                Store Name *
              </label>
              <Input
                id="storeName"
                name="storeName"
                required
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="tagline" className="text-sm font-medium">
                Tagline
              </label>
              <Input
                id="tagline"
                name="tagline"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Store Phone / WhatsApp
              </label>
              <Input
                id="phone"
                name="phone"
                placeholder="+91 82923 99080"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="upiId" className="text-sm font-medium">
                  Store UPI ID
                </label>
                {settings.upiId && (
                  <button
                    type="button"
                    onClick={() => setShowUpiPreview((prev) => !prev)}
                    className="text-xs text-[#1a3a7a] hover:underline font-semibold flex items-center gap-1"
                  >
                    <QrCode size={12} /> {showUpiPreview ? "Hide QR" : "Preview QR"}
                  </button>
                )}
              </div>
              <Input
                id="upiId"
                name="upiId"
                placeholder="e.g. yourstore@oksbi or merchant@upi"
                value={settings.upiId}
                onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
              />
              {showUpiPreview && settings.upiId && (
                <div className="mt-2 p-3 bg-[#faf9f6] border border-[#dfd8cc] rounded-lg text-center">
                  <p className="text-[11px] font-semibold text-[#1a3a7a] mb-2">Live UPI QR Code Preview (Scan Test)</p>
                  <img src={upiQrPreviewSrc} alt="UPI QR Preview" className="size-36 mx-auto rounded border bg-white p-1" />
                  <p className="text-[10px] text-[#706a61] mt-1 font-mono">{settings.upiId}</p>
                </div>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="address" className="text-sm font-medium">
                Full Store Address
              </label>
              <Input
                id="address"
                name="address"
                placeholder="Store address printed on receipts"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="gstin" className="text-sm font-medium">
                Store GSTIN
              </label>
              <Input
                id="gstin"
                name="gstin"
                placeholder="e.g. 29ABCDE1234F1Z5"
                value={settings.gstin}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value.toUpperCase() })}
              />
              <p className="text-xs text-[#8a847a]">Displayed on printed tax invoices and receipts.</p>
            </div>
          </div>
        </div>

        {/* ── Billing & Tax ── */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
            <Printer size={18} className="text-[#c9963e]" /> Billing &amp; Tax
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="taxRate" className="text-sm font-medium">
                Default Tax Rate (%)
              </label>
              <Input
                id="taxRate"
                name="taxRate"
                type="number"
                step="0.1"
                required
                value={settings.taxRate}
                onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="invoiceFooter" className="text-sm font-medium">
                Invoice Footer Message
              </label>
              <Input
                id="invoiceFooter"
                name="invoiceFooter"
                value={settings.invoiceFooter}
                onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Receipt Print Layout</label>
              <select
                value={settings.printFormat || "A4"}
                onChange={(e) => setSettings({ ...settings, printFormat: e.target.value })}
                className="w-full h-9 rounded-md border bg-white px-3 text-xs outline-none focus:border-[#c9963e]"
              >
                <option value="A4">Standard A4 Luxury Color Bill</option>
                <option value="THERMAL_80MM">Thermal Roll (80mm / POS printer)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Low Stock Warning Threshold</label>
              <Input
                type="number"
                value={settings.lowStockThreshold || 5}
                onChange={(e) => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value, 10) || 5 })}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* ── Invoice Customization ── */}
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
              { id: "showPolicyText", label: "Exchange Policy Text" },
            ].map((pref) => (
              <label key={pref.id} className="flex items-center space-x-3 rounded border p-3 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-[#9b7740] focus:ring-[#9b7740]"
                  checked={settings.invoicePreferences?.[pref.id] ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      invoicePreferences: {
                        ...(settings.invoicePreferences || {}),
                        [pref.id]: e.target.checked,
                      },
                    })
                  }
                />
                <span className="text-sm font-medium text-gray-700">{pref.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="gold" type="submit" disabled={saving} className="w-full sm:w-auto font-semibold">
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </form>

      {/* ── Data Export & Backup ── */}
      <div className="rounded-md border bg-white p-6 shadow-sm space-y-4">
        <div>
          <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
            <Database size={18} className="text-[#1a3a7a]" />
            Store Data Backup &amp; CSV Export
          </h3>
          <p className="text-xs sm:text-sm text-[#706a61] mt-1.5">
            Download your current store datasets as CSV spreadsheets for bookkeeping, Excel audits, or backups.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-2">
          <button
            type="button"
            onClick={() => handleExportData("products")}
            className="flex items-center justify-between rounded-lg border border-[#dfd8cc] p-3.5 hover:bg-[#faf9f6] transition-colors text-left"
          >
            <div>
              <p className="text-xs font-semibold text-[#0b0b0b]">Products Catalog</p>
              <p className="text-[11px] text-[#706a61]">SKUs, stock, prices</p>
            </div>
            <Download size={16} className="text-[#9b7740]" />
          </button>

          <button
            type="button"
            onClick={() => handleExportData("customers")}
            className="flex items-center justify-between rounded-lg border border-[#dfd8cc] p-3.5 hover:bg-[#faf9f6] transition-colors text-left"
          >
            <div>
              <p className="text-xs font-semibold text-[#0b0b0b]">Customers Ledger</p>
              <p className="text-[11px] text-[#706a61]">Clientele &amp; dues</p>
            </div>
            <Download size={16} className="text-[#1a5a5a]" />
          </button>

          <button
            type="button"
            onClick={() => handleExportData("orders")}
            className="flex items-center justify-between rounded-lg border border-[#dfd8cc] p-3.5 hover:bg-[#faf9f6] transition-colors text-left"
          >
            <div>
              <p className="text-xs font-semibold text-[#0b0b0b]">Sales Orders</p>
              <p className="text-[11px] text-[#706a61]">Invoices &amp; totals</p>
            </div>
            <Download size={16} className="text-[#1a6b3a]" />
          </button>

          <button
            type="button"
            onClick={() => handleExportData("expenses")}
            className="flex items-center justify-between rounded-lg border border-[#dfd8cc] p-3.5 hover:bg-[#faf9f6] transition-colors text-left"
          >
            <div>
              <p className="text-xs font-semibold text-[#0b0b0b]">Expenses Ledger</p>
              <p className="text-[11px] text-[#706a61]">Rent, staff, utilities</p>
            </div>
            <Download size={16} className="text-[#8a3a30]" />
          </button>
        </div>
      </div>

      {/* ── Password Change ── */}
      <form onSubmit={handlePasswordChange} className="space-y-5 rounded-md border bg-white p-6 shadow-sm">
        <div>
          <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
            <KeyRound size={18} className="text-[#8a5a10]" />
            Change Admin Password
          </h3>
          <p className="text-sm text-[#706a61] mt-2">
            Update your admin login password. You will need to enter your current password to confirm.
          </p>
        </div>

        {pwMessage && (
          <div
            className={`p-3 rounded-md text-sm ${
              pwMessage.type === "success"
                ? "bg-[#f0f9f4] text-[#1a6b3a] border border-[#a3d9b8]"
                : "bg-[#fff4f0] text-[#8a2a1a] border border-[#f0b0a0]"
            }`}
          >
            {pwMessage.text}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="currentPassword" className="text-sm font-medium">
              Current Password *
            </label>
            <Input
              id="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter your current password"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-medium">
              New Password *
            </label>
            <Input
              id="newPassword"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Minimum 12 characters; maximum 72 bytes"
              minLength={12}
              maxLength={72}
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm New Password *
            </label>
            <Input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Repeat new password"
              value={pwForm.confirmPassword}
              onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button type="submit" disabled={pwSaving} className="w-full sm:w-auto bg-[#0b0b0b] text-white hover:bg-[#2a2520]">
            {pwSaving ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </form>
    </div>
  );
}
