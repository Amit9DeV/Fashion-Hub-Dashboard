"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#faf9f6]">
      <div className="w-full max-w-md bg-white rounded-lg border border-[#e8e3da] p-8 text-center shadow-lg">
        <div className="mx-auto size-14 rounded-full bg-[#fef0f0] flex items-center justify-center text-[#8a1a1a] mb-5">
          <AlertTriangle size={28} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7740]">System Notice</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#0b0b0b] font-serif">Something went wrong</h2>
        <p className="mt-2 text-sm text-[#706a61] leading-relaxed">
          {error?.message || "An unexpected error occurred while loading this page. Our team has been notified."}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="gold"
            onClick={() => reset()}
            className="w-full sm:w-auto justify-center"
          >
            <RotateCcw size={15} className="mr-2" /> Try Again
          </Button>
          <Button
            variant="outline"
            asChild
            className="w-full sm:w-auto justify-center border-[#dfd8cc] text-[#0b0b0b] hover:bg-[#faf9f6]"
          >
            <Link href="/dashboard">
              <LayoutDashboard size={15} className="mr-2 text-[#9b7740]" /> Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
