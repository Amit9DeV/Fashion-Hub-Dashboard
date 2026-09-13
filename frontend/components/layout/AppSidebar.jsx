"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, ClipboardList, LayoutDashboard, MessageCircle, PackageSearch, Receipt, ReceiptText, RotateCcw, Settings, Shirt, Tags, UsersRound } from "lucide-react";
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
  { label: "Staff", href: "/staff", icon: PackageSearch },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside style={{ width: 240, background: '#0b0b0b', borderRight: '1px solid #1e1e1e', flexShrink: 0 }} className="hidden h-screen sticky top-0 flex-col lg:flex">
      {/* Brand */}
      <div className="px-5 py-7">
        <Link href="/dashboard">
          <BrandMark />
        </Link>
      </div>

      {/* Gold divider */}
      <div className="gold-rule mx-5" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`nav-item ${active ? 'active' : ''}`}
            >
              <Icon size={15} strokeWidth={1.6} style={{ flexShrink: 0 }} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom status */}
      <div className="px-3 pb-5">
        <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 6, padding: '10px 12px' }} className="flex items-center gap-2.5">
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4caf7d', flexShrink: 0, boxShadow: '0 0 6px #4caf7d60' }} />
          <span style={{ fontSize: 11, color: '#9c9489', letterSpacing: '0.06em' }}>Store online</span>
        </div>
      </div>
    </aside>
  );
}
