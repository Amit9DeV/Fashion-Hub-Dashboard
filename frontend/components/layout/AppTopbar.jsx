"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, Menu, X, LayoutDashboard, ReceiptText, ClipboardList, Shirt, Boxes, UsersRound, RotateCcw, BarChart3, MessageCircle, Users, Settings, ArrowRight, Tags, Receipt } from "lucide-react";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { BrandMark } from "@/components/layout/BrandMark";

const nav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Billing", href: "/billing", icon: ReceiptText },
  { label: "Orders", href: "/orders", icon: ClipboardList },
  { label: "Products", href: "/products", icon: Shirt },
  { label: "Pricing", href: "/pricing", icon: Tags },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Expenses", href: "/expenses", icon: Receipt },
  { label: "Customers", href: "/customers", icon: UsersRound },
  { label: "Returns & Exchanges", href: "/returns", icon: RotateCcw },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "WhatsApp", href: "/whatsapp", icon: MessageCircle },
  { label: "Staff", href: "/staff", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

const titles = {
  "/dashboard": "Dashboard", "/billing": "Billing", "/orders": "Orders",
  "/products": "Products", "/inventory": "Inventory", "/customers": "Customers",
  "/returns": "Returns & Exchanges", "/reports": "Reports", "/whatsapp": "WhatsApp",
  "/settings": "Settings", "/staff": "Staff", "/pricing": "Pricing", "/expenses": "Expenses",
};

export function AppTopbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pageTitle = Object.entries(titles).find(([k]) => pathname === k || pathname.startsWith(k + '/'))?.[1] || "Fashion Hub";

  return (
    <>
      {/* Main Header */}
      <header style={{ background: '#faf9f6', borderBottom: '1px solid #e8e3da', minHeight: 72 }} className="flex items-center justify-between px-7 sm:px-10 relative z-30">
        {/* Left: mobile menu + page identity */}
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-2 -ml-2 rounded text-[#4b4842] hover:bg-[#eee9df] transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <div>
            <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.22em', color: '#9b7740', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>
              Fashion Hub
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0b0b0b', letterSpacing: '-0.02em', fontFamily: "'Playfair Display', Georgia, serif", lineHeight: 1.1, marginTop: 1 }}>
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* Right: search + actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search */}
          <div className="hidden items-center gap-2 xl:flex" style={{ border: '1px solid #e2ddd5', background: '#fff', borderRadius: 4, padding: '7px 14px' }}>
            <Search size={14} style={{ color: '#9c9489' }} />
            <span style={{ fontSize: 12, color: '#9c9489', letterSpacing: '0.01em' }}>Search</span>
          </div>

          {/* Bell */}
          <button
            aria-label="Notifications"
            style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 4, color: '#5f584e' }}
            className="hover:bg-[#eee9df] transition-colors"
          >
            <Bell size={17} strokeWidth={1.6} />
          </button>

          {/* New Sale CTA */}
          <Link
            href="/billing"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#0b0b0b', color: '#d8b46a',
              padding: '9px 18px', borderRadius: 3,
              fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
              fontFamily: "'Inter', sans-serif", textDecoration: 'none',
              border: '1px solid #2a2520', whiteSpace: 'nowrap',
              transition: 'background 0.15s ease',
            }}
          >
            New sale <ArrowRight size={13} />
          </Link>

          {/* Sign out */}
          <div className="border-l border-[#e8e3da] pl-2 ml-1">
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 top-[72px] z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: 240, background: '#0b0b0b', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-6">
              <BrandMark />
            </div>
            <div className="gold-rule mx-5" />
            <nav className="px-3 py-4 space-y-0.5">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`nav-item ${active ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon size={15} strokeWidth={1.6} style={{ flexShrink: 0 }} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
