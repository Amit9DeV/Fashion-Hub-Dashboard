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

        {/* Right: search + actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Search */}
          <div className="hidden items-center gap-2 xl:flex" style={{ border: '1px solid #e2ddd5', background: '#fff', borderRadius: 4, padding: '7px 14px' }}>
            <Search size={14} style={{ color: '#9c9489' }} />
            <span style={{ fontSize: 12, color: '#9c9489', letterSpacing: '0.01em' }}>Search</span>
          </div>

          {/* Bell (hidden on very small mobile) */}
          <button
            aria-label="Notifications"
            style={{ width: 34, height: 34, placeItems: 'center', borderRadius: 4, color: '#5f584e' }}
            className="hidden sm:grid hover:bg-[#eee9df] transition-colors"
          >
            <Bell size={16} strokeWidth={1.6} />
          </button>

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
