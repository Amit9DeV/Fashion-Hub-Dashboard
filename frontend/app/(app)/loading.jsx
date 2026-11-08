import { BrandMark } from "@/components/layout/BrandMark";

export default function AppLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
      {/* Branded Pulse Emblem */}
      <div className="relative mb-6">
        <div className="absolute -inset-2 rounded-lg bg-[#c9963e]/15 blur-sm animate-pulse" />
        <BrandMark compact />
      </div>

      {/* Loading copy */}
      <p className="eyebrow text-[#9b7740] tracking-[0.24em] text-xs font-semibold uppercase">
        Fashion Hub
      </p>
      <h2 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-[#0b0b0b] font-serif">
        Loading workspace…
      </h2>
      <p className="mt-1 text-xs text-[#8a847a]">
        Syncing inventory, orders, and sales ledger
      </p>

      {/* Sleek Golden Loading Bar */}
      <div className="mt-6 w-48 h-1 bg-[#e8e3da] rounded-full overflow-hidden relative">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#9b7740] via-[#d8b46a] to-[#9b7740] rounded-full w-24 animate-[shimmer_1.4s_infinite]"
          style={{
            animation: "shimmer 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}

