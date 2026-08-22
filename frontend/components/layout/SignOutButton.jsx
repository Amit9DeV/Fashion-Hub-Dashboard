"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/src/services/api";

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    try {
      await api.auth.logout();
    } catch (e) {} // ignore errors
    await import("@/app/(auth)/login/actions").then(m => m.clearFrontendSession());
    router.replace("/login");
    router.refresh();
  }
  return <Button variant="ghost" size="sm" onClick={signOut} className="px-2 sm:px-3"><LogOut size={15} /> <span className="hidden sm:inline-block ml-2">Sign out</span></Button>;
}
