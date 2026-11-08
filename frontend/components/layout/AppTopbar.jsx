"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, Menu, X, LayoutDashboard, ReceiptText, ClipboardList, Shirt, Boxes, UsersRound, RotateCcw, BarChart3, MessageCircle, Users, Settings, ArrowRight, Tags, Receipt, Truck } from "lucide-react";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { BrandMark } from "@/components/layout/BrandMark";
import { api } from "@/src/services/api";
import { can } from "@/lib/permissions";

const nav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  { label: "Billing", href: "/billing", icon: ReceiptText, permission: "billing:use" },
  { label: "Orders", href: "/orders", icon: ClipboardList, permission: "orders:view" },
  { label: "Products", href: "/products", icon: Shirt, permission: "products:view" },
  { label: "Pricing", href: "/pricing", icon: Tags, permission: "pricing:manage" },
  { label: "Inventory", href: "/inventory", icon: Boxes, permission: "inventory:view" },
  { label: "Purchases", href: "/purchases", icon: Truck, permission: "purchases:manage" },
  { label: "Expenses", href: "/expenses", icon: Receipt, permission: "expenses:manage" },
  { label: "Customers", href: "/customers", icon: UsersRound, permission: "customers:view" },
  { label: "Returns & Exchanges", href: "/returns", icon: RotateCcw, permission: "returns:manage" },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "reports:view" },
  { label: "WhatsApp", href: "/whatsapp", icon: MessageCircle, permission: "whatsapp:manage" },
  { label: "Staff", href: "/staff", icon: Users, permission: "staff:manage" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "settings:manage" },
];

const titles = {
  "/dashboard": "Dashboard", "/billing": "Billing", "/orders": "Orders",
  "/products": "Products", "/inventory": "Inventory", "/purchases": "Purchases & Suppliers",
  "/customers": "Customers", "/returns": "Returns & Exchanges", "/reports": "Reports",
  "/whatsapp": "WhatsApp", "/settings": "Settings", "/staff": "Staff", "/pricing": "Pricing", "/expenses": "Expenses",
};

export function AppTopbar({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifData, setNotifData] = useState(null);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(null);

  const pageTitle = Object.entries(titles).find(([k]) => pathname === k || pathname.startsWith(k + '/'))?.[1] || "Fashion Hub";

  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const [productsRes, whatsappRes, drawerRes] = await Promise.allSettled([
        can(user, "inventory:view") ? api.products.getAll() : Promise.resolve(null),
        can(user, "whatsapp:manage") ? api.whatsapp.getMessages() : Promise.resolve(null),
        can(user, "billing:use") ? api.cashDrawer.getStatus() : Promise.resolve(null),
      ]);

      if (drawerRes.status === "fulfilled" && drawerRes.value) {
        const drawerData = drawerRes.value.data || drawerRes.value;
        setDrawerOpen(drawerData?.status === "OPEN");
      } else if (drawerRes.status === "fulfilled") {
        setDrawerOpen(false);
      }

      let outOfStockCount = 0;
      let lowStockCount = 0;
      let failedWhatsappCount = 0;

      if (productsRes.status === "fulfilled" && productsRes.value?.products) {
        productsRes.value.products.forEach(p => {
          (p.variants || []).forEach(v => {
            if (v.stock === 0) outOfStockCount++;
            else if (v.stock > 0 && v.stock <= (v.reorderLevel || 5)) lowStockCount++;
          });
        });
      }

      if (whatsappRes.status === "fulfilled" && Array.isArray(whatsappRes.value)) {
        failedWhatsappCount = whatsappRes.value.filter(m => m.status === "FAILED" || m.status === "QUEUED").length;
      }

      setNotifData({ outOfStockCount, lowStockCount, failedWhatsappCount });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const alertCount = (notifData?.outOfStockCount || 0) + (notifData?.lowStockCount || 0) + (notifData?.failedWhatsappCount || 0);

  return (
    <>
      {/* Main Header */}
      <header
        style={{ background: '#faf9f6', borderBottom: '1px solid #e8e3da', minHeight: 64 }}
        className="flex items-center justify-between px-3 sm:px-6 md:px-10 relative z-30"
      >
        {/* Left: mobile menu + page identity */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            className="lg:hidden p-1.5 -ml-1 rounded text-[#4b4842] hover:bg-[#eee9df] active:bg-[#e4ded3] transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div>
            <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.22em', color: '#9b7740', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>
              Fashion Hub
            </p>
            <h1
              style={{ fontWeight: 700, color: '#0b0b0b', letterSpacing: '-0.02em', fontFamily: "'Playfair Display', Georgia, serif", lineHeight: 1.1, marginTop: 1 }}
              className="text-lg sm:text-2xl truncate max-w-[170px] sm:max-w-xs md:max-w-md"
            >
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* Right: search + notifications + actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Quick Search */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = searchQuery.trim();
              if (q) {
                if (/^(FH|INV|ORD|\d{6})/i.test(q)) {
                  router.push(`/orders?q=${encodeURIComponent(q)}`);
                } else {
                  router.push(`/products?q=${encodeURIComponent(q)}`);
                }
                setSearchQuery("");
              }
            }}
            className="hidden items-center gap-2 xl:flex relative"
          >
            <div className="flex items-center gap-2 border border-[#e2ddd5] bg-white rounded px-2.5 py-1.5 focus-within:border-[#9b7740] focus-within:ring-1 focus-within:ring-[#9b7740]/20 transition-all">
              <Search size={14} className="text-[#9c9489]" />
              <input
                type="text"
                placeholder="Search products, orders (FH/)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs text-[#0b0b0b] placeholder:text-[#9c9489] outline-none w-48 bg-transparent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-[#9c9489] hover:text-[#0b0b0b]"
                >
                  ✕
                </button>
              )}
            </div>
          </form>

          {/* Cash Drawer Status Pill */}
          {can(user, "billing:use") && drawerOpen !== null && (
            <Link
              href="/billing"
              className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                drawerOpen
                  ? "bg-[#edf7ed] border-[#c8e6c9] text-[#1b5e20] hover:bg-[#e8f5e9]"
                  : "bg-[#fff8e1] border-[#ffe082] text-[#b78103] hover:bg-[#ffecb3]"
              }`}
              title={drawerOpen ? "Cash drawer is OPEN for today's shift" : "Cash drawer is CLOSED. Tap to open in POS."}
            >
              <span className={`size-1.5 rounded-full ${drawerOpen ? "bg-[#2e7d32]" : "bg-[#f59e0b]"}`} />
              <span>Register: {drawerOpen ? "Open" : "Closed"}</span>
            </Link>
          )}

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => {
                setNotifOpen(!notifOpen);
                if (!notifOpen && !notifData) fetchNotifications();
              }}
              style={{ width: 34, height: 34, placeItems: 'center', borderRadius: 4, color: '#5f584e' }}
              className="relative hidden sm:grid hover:bg-[#eee9df] transition-colors"
            >
              <Bell size={16} strokeWidth={1.6} />
              {alertCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8a1a1a] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8a1a1a]"></span>
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 mt-2 w-80 rounded-md border border-[#dfd8cc] bg-white shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="border-b border-[#f0ede7] bg-[#faf9f6] px-4 py-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-xs text-[#0b0b0b] uppercase tracking-wider">Store Alerts</h4>
                      <p className="text-[11px] text-[#706a61] mt-0.5">Live store notifications</p>
                    </div>
                    {alertCount > 0 && (
                      <span className="rounded-full bg-[#fef0f0] border border-[#f5c6cb] px-2 py-0.5 text-[10px] font-bold text-[#8a1a1a]">
                        {alertCount} alert{alertCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-[#f5f2ee] p-0">
                    {loadingNotifs ? (
                      <div className="p-4 text-center text-xs text-[#706a61]">Loading alerts...</div>
                    ) : (
                      <>
                        {notifData?.outOfStockCount > 0 && (
                          <Link
                            href="/inventory"
                            onClick={() => setNotifOpen(false)}
                            className="p-3 flex items-start gap-2.5 hover:bg-[#fff9f9] transition-colors block"
                          >
                            <span className="size-2 rounded-full bg-[#8a1a1a] mt-1.5 shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-[#8a1a1a]">
                                {notifData.outOfStockCount} variant{notifData.outOfStockCount > 1 ? 's' : ''} out of stock
                              </p>
                              <p className="text-[11px] text-[#706a61] mt-0.5">Tap to review live inventory and replenish stock.</p>
                            </div>
                          </Link>
                        )}
                        {notifData?.lowStockCount > 0 && (
                          <Link
                            href="/inventory"
                            onClick={() => setNotifOpen(false)}
                            className="p-3 flex items-start gap-2.5 hover:bg-[#fffcf5] transition-colors block"
                          >
                            <span className="size-2 rounded-full bg-[#8a5a10] mt-1.5 shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-[#8a5a10]">
                                {notifData.lowStockCount} variant{notifData.lowStockCount > 1 ? 's' : ''} running low
                              </p>
                              <p className="text-[11px] text-[#706a61] mt-0.5">Stock level is at or below reorder threshold.</p>
                            </div>
                          </Link>
                        )}
                        {notifData?.failedWhatsappCount > 0 && (
                          <Link
                            href="/whatsapp"
                            onClick={() => setNotifOpen(false)}
                            className="p-3 flex items-start gap-2.5 hover:bg-[#faf9f6] transition-colors block"
                          >
                            <span className="size-2 rounded-full bg-[#1a3a7a] mt-1.5 shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-[#1a3a7a]">
                                {notifData.failedWhatsappCount} WhatsApp bill{notifData.failedWhatsappCount > 1 ? 's' : ''} pending/failed
                              </p>
                              <p className="text-[11px] text-[#706a61] mt-0.5">Tap to retry delivery or verify customer numbers.</p>
                            </div>
                          </Link>
                        )}
                        {alertCount === 0 && (
                          <div className="p-6 text-center text-xs text-[#706a61]">
                            <p className="font-semibold text-[#1a6b3a]">All systems optimal</p>
                            <p className="text-[11px] text-[#8a847a] mt-1">Stock levels healthy and no pending delivery errors.</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="border-t border-[#f0ede7] bg-[#faf9f6] px-3 py-2 flex justify-between items-center text-[11px]">
                    {can(user, "inventory:view") && (
                      <Link href="/inventory" onClick={() => setNotifOpen(false)} className="text-[#9b7740] font-semibold hover:underline">
                        View Inventory &rarr;
                      </Link>
                    )}
                    {can(user, "reports:view") && (
                      <Link href="/reports" onClick={() => setNotifOpen(false)} className="text-[#5f584e] hover:underline">
                        Store Reports
                      </Link>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* New Sale CTA */}
          <Link
            href="/billing"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: '#0b0b0b', color: '#d8b46a',
              borderRadius: 3,
              fontWeight: 600, letterSpacing: '0.04em',
              fontFamily: "'Inter', sans-serif", textDecoration: 'none',
              border: '1px solid #2a2520', whiteSpace: 'nowrap',
              transition: 'background 0.15s ease',
            }}
            className="px-2.5 py-1.5 text-xs sm:px-4 sm:py-2"
          >
            <span className="hidden xs:inline">New sale</span>
            <span className="xs:hidden">+ Sale</span>
            <ArrowRight size={12} />
          </Link>

          {/* Sign out */}
          <div className="border-l border-[#e8e3da] pl-1.5 sm:pl-2 ml-0.5 sm:ml-1">
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs lg:hidden flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            style={{ width: 280, maxWidth: '85vw', background: '#0b0b0b' }}
            className="h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-5 border-b border-[#1e1e1e]">
              <BrandMark />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded text-[#9c9489] hover:text-white hover:bg-[#1a1a1a]"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="gold-rule mx-5" />

            {/* Navigation links */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {nav.filter((item) => can(user, item.permission)).map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`nav-item ${active ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon size={16} strokeWidth={1.6} style={{ flexShrink: 0 }} />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#1e1e1e] bg-[#111] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#4caf7d]" />
                <span className="text-xs text-[#9c9489]">Fashion Hub POS</span>
              </div>
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
