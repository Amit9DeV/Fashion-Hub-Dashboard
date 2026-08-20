"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, CircleDollarSign, ClipboardList, LayoutDashboard, MessageCircle, PackageSearch, ReceiptText, RotateCcw, Settings, Shirt, UsersRound } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
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

export function AppSidebar({ user }) {
  const pathname = usePathname();
  return (
    <aside className="hidden min-h-screen w-64 shrink-0 flex-col bg-[#0b0b0b] px-4 py-6 lg:flex">
      <Link href="/dashboard" className="px-3"><BrandMark /></Link>
      <div className="my-7 h-px gold-rule" />
      <nav className="space-y-1">
        {nav.filter((item) => item.permission === "*" ? user.role === "ADMIN" : can(user, item.permission)).map((item) => {
          const Icon = item.icon;
          const active = item.href === pathname;
          const content = <><Icon size={18} strokeWidth={1.75} /><span>{item.label}</span>{!item.href && <span className="ml-auto text-[9px] uppercase tracking-wider text-[#958a78]">Soon</span>}</>;
          const className = `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${active ? "border-l-2 border-[#c9963e] bg-[#202020] text-white" : "text-[#c8c1b6] hover:bg-[#1a1a1a] hover:text-white"}`;
          return item.href ? <Link key={item.label} href={item.href} className={className}>{content}</Link> : <div key={item.label} className={`${className} cursor-default opacity-65`}>{content}</div>;
        })}
      </nav>
      <div className="mt-auto rounded-md border border-[#38342d] bg-[#151515] p-3 text-xs text-[#c8c1b6]">
        <div className="mb-1 flex items-center gap-2 text-[#e2d8ca]"><span className="size-1.5 rounded-full bg-[#c9963e]" /> Store online</div>
        <p>Fashion Hub retail system</p>
      </div>
    </aside>
  );
}
