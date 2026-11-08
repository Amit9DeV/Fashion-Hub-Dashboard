"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // When route changes, complete the bar and hide it
  useEffect(() => {
    if (loading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Intercept click on internal links
  useEffect(() => {
    const handleDocumentClick = (e) => {
      const anchor = e.target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore external, hash, mailto, tel, target="_blank", or download links
      if (
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      // Ignore clicks with modifier keys (cmd/ctrl/shift/alt)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Check if target is a different route
      const currentUrl = window.location.pathname + window.location.search;
      if (href !== currentUrl) {
        setLoading(true);
        setProgress(25);

        // Gradually increment progress while waiting
        const t1 = setTimeout(() => setProgress(55), 150);
        const t2 = setTimeout(() => setProgress(80), 400);

        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      }
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 99999,
        pointerEvents: "none",
        background: "transparent",
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: "100%",
          background: "linear-gradient(90deg, #c9963e 0%, #f3d48d 50%, #c9963e 100%)",
          boxShadow: "0 0 10px rgba(201, 150, 62, 0.7), 0 0 4px rgba(243, 212, 141, 0.9)",
          transition: progress === 100 ? "width 0.2s ease-out, opacity 0.3s ease-out" : "width 0.3s ease-in-out",
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}

