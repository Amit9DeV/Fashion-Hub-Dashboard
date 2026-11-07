import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
export { can, rolePermissions } from "@/lib/permissions";

const COOKIE_NAME = "fashion_hub_session";
const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is not set.");
  }
  return encoder.encode(secret);
}

// ─── Create a signed session cookie ──────────────────────────────────────────
export async function createSession(user) {
  // If the backend already sent us a signed token, store it directly
  // (avoids double-signing and keeps both ends on the same key)
  const token =
    user.token ||
    (await new SignJWT({
      name: user.name,
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject((user._id || user.id).toString())
      .setExpirationTime("12h")
      .sign(getSecret()));

  let isHttps = false;
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const proto = h.get("x-forwarded-proto");
    const host = h.get("host") || "";
    isHttps =
      proto === "https" ||
      host.includes("vercel.app") ||
      host.includes("onrender.com");
  } catch {
    isHttps = Boolean(process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://"));
  }

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isHttps,
    // The browser talks to the same-origin Next.js API proxy, so a cross-site
    // cookie is unnecessary and would make state-changing requests CSRF-prone.
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });

  return token;
}

// ─── Clear session cookie ─────────────────────────────────────────────────────
export async function clearSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
  });
}

// ─── Read and verify the session cookie ──────────────────────────────────────
export async function getCurrentUser() {
  try {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (!token) return null;

    // Verify signature — no insecure decodeJwt fallback
    let payload = null;
    try {
      const verified = await jwtVerify(token, getSecret(), {
        clockTolerance: 60,
      });
      payload = verified.payload;
    } catch {
      // Invalid signature or expired — treat as unauthenticated
      return null;
    }

    if (!payload?.sub && !payload?.id) return null;

    return {
      id: payload.sub || payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      token,
    };
  } catch {
    return null;
  }
}
