import { cn } from "@/lib/utils";

export function Input({ className, ...props }) {
  return (
    <input
      className={cn("flex h-10 w-full rounded-md border border-[#d6cfc3] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#8a847a] focus:border-[#c9963e] focus:ring-2 focus:ring-[#c9963e]/20 disabled:cursor-not-allowed disabled:bg-[#f0ede7]", className)}
      {...props}
    />
  );
}
