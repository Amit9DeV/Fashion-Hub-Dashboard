"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppSectionError({ error, reset }) {
  useEffect(() => {
    console.error("App module error:", error);
  }, [error]);

  return (
    <div className="min-h-[500px] flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white rounded-lg border border-[#e8e3da] p-8 text-center shadow-sm">
        <div className="mx-auto size-12 rounded-full bg-[#fdf8f0] flex items-center justify-center text-[#8a5a10] mb-4">
          <AlertCircle size={24} />
        </div>
        <p className="eyebrow text-[#9b7740]">Module Encountered an Issue</p>
        <h3 className="mt-2 text-xl font-bold tracking-tight text-[#0b0b0b] font-serif">Unable to load this section</h3>
        <p className="mt-2 text-xs sm:text-sm text-[#706a61] leading-relaxed">
          {error?.message || "There was a problem loading data from the server. Please try refreshing or returning to the dashboard."}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="gold"
            size="sm"
            onClick={() => reset()}
            className="justify-center"
          >
            <RefreshCw size={14} className="mr-1.5" /> Retry Action
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="justify-center border-[#dfd8cc] text-[#0b0b0b] hover:bg-[#faf9f6]"
          >
            <Link href="/dashboard">
              <LayoutDashboard size={14} className="mr-1.5 text-[#9b7740]" /> Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
