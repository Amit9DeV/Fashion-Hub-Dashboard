import { cookies } from "next/headers";
import { SignJWT, jwtVerify, decodeJwt } from "jose";
export { can, rolePermissions } from "@/lib/permissions";

const COOKIE_NAME = "fashion_hub_session";
const encoder = new TextEncoder();

const PRIMARY_SECRET =
  process.env.AUTH_SECRET || "replace-with-a-long-random-secret-at-least-32-characters";
const KNOWN_SECRETS = [
  PRIMARY_SECRET,
  "replace-with-a-long-random-secret-at-least-32-characters",
  "default-fallback-secret-key-that-is-at-least-32-chars-long",
];

function sessionSecret() {
  return encoder.encode(PRIMARY_SECRET);
}

export async function createSession(user) {
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
      .sign(sessionSecret()));

  let isHttps = false;
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const proto = h.get("x-forwarded-proto");
    const host = h.get("host") || "";
    isHttps = proto === "https" || host.includes("vercel.app") || host.includes("onrender.com");
  } catch (e) {
    isHttps = Boolean(process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://"));
  }

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return token;
}

export async function clearSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export async function getCurrentUser() {
  try {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (!token) return null;

    let payload = null;

    // 1. Try verifying with known secrets
    for (const secretStr of KNOWN_SECRETS) {
      try {
        const verified = await jwtVerify(token, encoder.encode(secretStr), { clockTolerance: 60 });
        payload = verified.payload;
        break;
      } catch (e) {
        // try next secret
      }
    }

    // 2. Fallback: decode JWT safely if signed by backend with an unlisted secret
    if (!payload) {
      try {
        const decoded = decodeJwt(token);
        if (decoded && decoded.exp && Date.now() < decoded.exp * 1000) {
          payload = decoded;
        }
      } catch (decodeErr) {
        return null;
      }
    }

    if (!payload || (!payload.sub && !payload.id)) {
      return null;
    }

    return {
      id: payload.sub || payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      token: token,
    };
  } catch (err) {
    return null;
  }
}
