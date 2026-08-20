export function BrandMark({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center border border-[#c9963e] bg-[#0b0b0b] font-serif text-lg font-bold tracking-tight text-[#d8b46a]">FH</div>
      {!compact && <div className="leading-tight"><p className="font-serif text-base tracking-[0.16em] text-white">FASHION HUB</p><p className="mt-0.5 text-[9px] uppercase tracking-[0.21em] text-[#d8b46a]">Premium menswear</p></div>}
    </div>
  );
}
