"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiBase } from "@/lib/backend";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#faf9f6]" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("admin@fashionhub.local");
  const [password, setPassword] = useState("FashionHub@123");
  const [error, setError] = useState(params.get("error") || "");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${apiBase()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // allows Express to set the session cookie on the browser
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Invalid credentials.");

      // 1. Sync session cookie into Next.js domain (for Server Components like Dashboard)
      const { syncSession } = await import("./actions");
      const actionResult = await syncSession(data.data);
      if (actionResult && !actionResult.success) {
        console.warn("Session cookie sync warning:", actionResult.error);
      }

      // 2. Store token in localStorage (for client-side API requests)
      if (data.data?.token) {
        localStorage.setItem("fashion_hub_token", data.data.token);
        localStorage.setItem("fashion_hub_user", JSON.stringify(data.data));
      }

      router.replace(params.get("next") || "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message || "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-[#0b0b0b] lg:grid-cols-[1.15fr_0.85fr]">
      <section className="relative hidden overflow-hidden border-r border-[#3c3324] p-12 lg:flex lg:flex-col lg:justify-between">
        <BrandMark />
        <div className="relative z-10 max-w-xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-[#d8b46a]">
            Retail, refined
          </p>
          <h1 className="font-serif text-6xl leading-[1.02] text-white">
            A better counter experience.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-[#c6beb1]">
            Fast billing, precise stock, and customer relationships—built for
            the way Fashion Hub sells.
          </p>
        </div>
        <p className="text-xs tracking-wide text-[#8f887e]">
          FASHION HUB · PREMIUM MEN&apos;S FASHION
        </p>
        <div className="absolute -bottom-56 -right-32 size-[560px] rounded-full border border-[#6f552d]" />
        <div className="absolute -bottom-40 -right-16 size-[440px] rounded-full border border-[#3d3222]" />
      </section>
      <section className="flex items-center justify-center bg-[#faf9f6] p-6 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-12 lg:hidden">
            <BrandMark compact />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7740]">
            Staff access
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-[#706a61]">
            Sign in to your Fashion Hub workspace.
          </p>
          <div className="mt-8 space-y-4">
            <label className="block text-sm font-medium">
              Email
              <div className="relative mt-1.5">
                <Mail
                  className="absolute left-3 top-3 text-[#8a847a]"
                  size={16}
                />
                <Input
                  className="pl-10"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </label>
            <label className="block text-sm font-medium">
              Password
              <div className="relative mt-1.5">
                <LockKeyhole
                  className="absolute left-3 top-3 text-[#8a847a]"
                  size={16}
                />
                <Input
                  className="pl-10"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>
          </div>
          {error && (
            <p className="mt-4 rounded-md border border-[#e0ae9f] bg-[#fff0ec] px-3 py-2 text-sm text-[#8a2f20]">
              {error}
            </p>
          )}
          <Button
            className="mt-6 w-full"
            variant="gold"
            size="lg"
            disabled={busy}
          >
            {busy ? (
              "Signing in…"
            ) : (
              <>
                Sign in <ArrowRight size={17} />
              </>
            )}
          </Button>
          <p className="mt-6 text-center text-xs leading-5 text-[#888177]">
            Use only your own staff account. Completed sales are permanently
            recorded for audit.
          </p>
        </form>
      </section>
    </main>
  );
}
