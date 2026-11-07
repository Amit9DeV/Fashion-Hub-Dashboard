import Link from "next/link";
import { Compass, ArrowRight, LayoutDashboard, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#faf9f6]">
      <div className="w-full max-w-md bg-white rounded-lg border border-[#e8e3da] p-8 text-center shadow-lg">
        <div className="mx-auto size-16 rounded-full bg-[#faf5ec] flex items-center justify-center text-[#c9963e] mb-5 border border-[#eedec0]">
          <Compass size={32} />
        </div>
        <p className="eyebrow text-[#9b7740]">404 · Page Not Found</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#0b0b0b] font-serif">Lost in the Collection?</h2>
        <p className="mt-2 text-sm text-[#706a61] leading-relaxed">
          The page or resource you are looking for does not exist or has been relocated.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="gold"
            asChild
            className="w-full sm:w-auto justify-center"
          >
            <Link href="/dashboard">
              <LayoutDashboard size={15} className="mr-2" /> Go to Dashboard
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="w-full sm:w-auto justify-center border-[#dfd8cc] text-[#0b0b0b] hover:bg-[#faf9f6]"
          >
            <Link href="/billing">
              <ReceiptText size={15} className="mr-2 text-[#9b7740]" /> Open POS
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
