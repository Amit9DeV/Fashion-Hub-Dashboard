import { cookies } from "next/headers";
import { apiBase } from "@/lib/backend";

const FORWARDED_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"];

async function proxyRequest(request, context) {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) {
      return Response.json({ success: false, message: "Invalid request origin" }, { status: 403 });
    }
  }

  const { path = [] } = await context.params;
  if (path.some((segment) => segment === "." || segment === "..")) {
    return Response.json({ success: false, message: "Invalid API path" }, { status: 400 });
  }

  const isLogin = method === "POST" && path.length === 2 && path[0] === "auth" && path[1] === "login";
  const isLogout = method === "POST" && path.length === 2 && path[0] === "auth" && path[1] === "logout";
  const isHealth = path.length === 1 && path[0] === "health";
  const cookieStore = await cookies();
  const authHeader = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = cookieStore.get("fashion_hub_session")?.value || authHeader;
  if (!token && !isLogin && !isLogout && !isHealth) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const configuredApi = apiBase().replace(/\/$/, "");
  const backendOrigin = configuredApi.replace(/\/api$/i, "");
  const target = new URL(`${backendOrigin}/api/${path.map(encodeURIComponent).join("/")}`);
  target.search = new URL(request.url).search;

  const headers = new Headers({ Accept: request.headers.get("accept") || "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers.set("X-Forwarded-For", forwardedFor);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const idempotencyKey = request.headers.get("idempotency-key") || request.headers.get("Idempotency-Key");
  if (idempotencyKey) headers.set("idempotency-key", idempotencyKey);

  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  try {
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      cache: "no-store",
      signal: request.signal,
    });
    const responseHeaders = new Headers();
    for (const name of ["content-type", "content-disposition", "cache-control"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set("Cache-Control", "no-store");
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { success: false, message: "The backend service is unavailable. Please retry." },
      { status: 503 }
    );
  }
}

export const dynamic = "force-dynamic";
export const GET = proxyRequest;
export const HEAD = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
