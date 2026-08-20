"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, Menu, X, LayoutDashboard, ReceiptText, ClipboardList, Shirt, Boxes, UsersRound, RotateCcw, BarChart3, MessageCircle, PackageSearch, Settings } from "lucide-react";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { can } from "@/lib/permissions";

const nav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  { label: "Billing", href: "/billing", icon: ReceiptText, permission: "billing:use" },
  { label: "Orders", href: "/orders", icon: ClipboardList, permission: "orders:view" },
  { label: "Products", href: "/products", icon: Shirt, permission: "products:view" },
  { label: "Inventory", href: "/inventory", icon: Boxes, permission: "inventory:view" },
  { label: "Customers", href: "/customers", icon: UsersRound, permission: "customers:view" },
  { label: "Returns & Exchanges", href: "/returns", icon: RotateCcw, permission: "orders:view" },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "dashboard:view" },
  { label: "WhatsApp", href: "/whatsapp", icon: MessageCircle, permission: "orders:view" },
  { label: "Staff", href: "/staff", icon: PackageSearch, permission: "*" },
  { label: "Settings", href: "/settings", icon: Settings, permission: "*" },
];

const titles = { "/dashboard": "Dashboard", "/billing": "Billing", "/orders": "Orders", "/products": "Products", "/inventory": "Inventory", "/customers": "Customers", "/returns": "Returns", "/reports": "Reports", "/whatsapp": "WhatsApp", "/settings": "Settings", "/staff": "Staff" };

export function AppTopbar({ user }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="flex min-h-20 items-center justify-between border-b border-[#e8e3da] bg-[#faf9f6] px-5 sm:px-8 relative z-30">
        <div className="flex items-center gap-3">
          <button 
            className="lg:hidden p-2 -ml-2 rounded-md hover:bg-[#eee9df] text-[#4b4842]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9b7740]">Fashion Hub</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">{titles[pathname] || "Fashion Hub"}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm text-[#837d73] xl:flex"><Search size={16} /> Search</div>
          <button aria-label="Notifications" className="grid size-9 place-items-center rounded-md text-[#4b4842] hover:bg-[#eee9df]"><Bell size={18} /></button>
          <div className="hidden border-l border-[#ded8cd] pl-4 sm:block"><p className="text-sm font-medium">{user.name}</p><p className="text-[10px] font-semibold tracking-[0.12em] text-[#8d6d39]">{user.role}</p></div>
          <SignOutButton />
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-20 z-40 bg-black/50 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="absolute left-0 top-0 h-full w-64 bg-[#0b0b0b] px-4 py-6 overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <nav className="space-y-1">
              {nav.filter((item) => item.permission === "*" ? user.role === "ADMIN" : can(user, item.permission)).map((item) => {
                const Icon = item.icon;
                const active = item.href === pathname;
                const content = <><Icon size={18} strokeWidth={1.75} /><span>{item.label}</span>{!item.href && <span className="ml-auto text-[9px] uppercase tracking-wider text-[#958a78]">Soon</span>}</>;
                const className = `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${active ? "border-l-2 border-[#c9963e] bg-[#202020] text-white" : "text-[#c8c1b6] hover:bg-[#1a1a1a] hover:text-white"}`;
                return item.href ? (
                  <Link key={item.label} href={item.href} className={className} onClick={() => setMobileMenuOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div key={item.label} className={`${className} cursor-default opacity-65`}>{content}</div>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
