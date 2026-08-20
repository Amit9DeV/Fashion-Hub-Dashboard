import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
export { can, rolePermissions } from "@/lib/permissions";

const COOKIE_NAME = "fashion_hub_session";
const encoder = new TextEncoder();

function sessionSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be a random value of at least 32 characters.");
  }
  return encoder.encode(secret);
}

export async function createSession(user) {
  const token = await new SignJWT({
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user._id.toString())
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(sessionSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      token: token,
    };
  } catch {
    return null;
  }
}
