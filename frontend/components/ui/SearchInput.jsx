"use client";

import { Search } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition } from "react";

export function SearchInput({ placeholder = "Search..." }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [isPending, startTransition] = useTransition();

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      const currentQ = searchParams.get("q") || "";
      if (query !== currentQ) {
        const params = new URLSearchParams(searchParams);
        if (query) {
          params.set("q", query);
        } else {
          params.delete("q");
        }
        
        startTransition(() => {
          router.replace(`${pathname}?${params.toString()}`);
        });
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [query, router, pathname, searchParams]);

  return (
    <div className="relative flex-1 max-w-sm">
      <Search size={16} className={`absolute left-3 top-2.5 ${isPending ? "text-[#c9963e] animate-pulse" : "text-gray-400"}`} />
      <input 
        type="text" 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder} 
        className="w-full border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#9b7740]"
      />
    </div>
  );
}
