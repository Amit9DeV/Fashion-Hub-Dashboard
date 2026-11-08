"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/src/services/api";
import { clearFrontendSession } from "@/app/(auth)/login/actions";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    try {
      await api.auth.logout().catch(() => {});

      await clearFrontendSession().catch(() => {});

      if (typeof window !== "undefined") {
        localStorage.removeItem("fashion_hub_token");
        localStorage.removeItem("fashion_hub_user");
      }
    } finally {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      } else {
        router.replace("/login");
      }
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={signOut} className="px-2 sm:px-3">
      <LogOut size={15} /> <span className="hidden sm:inline-block ml-2">Sign out</span>
    </Button>
  );
}
