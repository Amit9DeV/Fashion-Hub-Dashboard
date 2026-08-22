import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const publicPaths = ["/login", "/api/auth/login"];

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  if (publicPaths.includes(pathname) || pathname.startsWith("/api/public/invoices/")) return NextResponse.next();

  const token = request.cookies.get("fashion_hub_session")?.value;
  let authenticated = false;
  try {
    const secretValue = process.env.AUTH_SECRET || "default-fallback-secret-key-that-is-at-least-32-chars-long";
    const secret = new TextEncoder().encode(secretValue);
    if (token) {
      await jwtVerify(token, secret, { clockTolerance: 60 });
      authenticated = true;
    }
  } catch {
    authenticated = false;
  }

  if (authenticated) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
