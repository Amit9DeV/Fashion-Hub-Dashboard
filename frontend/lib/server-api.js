import { cookies } from "next/headers";
import { apiBase } from "./backend";

export async function serverFetch(endpoint, init = {}) {
  let cookieHeader = "";
  let authToken = null;

  try {
    const cookieStore = await cookies();
    cookieHeader = cookieStore.toString();
    authToken = cookieStore.get("fashion_hub_session")?.value;
  } catch (err) {
    // In case cookies() cannot be accessed
  }

  const headers = {
    ...(cookieHeader ? { cookie: cookieHeader } : {}),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(init.headers || {}),
  };

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${apiBase()}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  try {
    return await fetch(url, {
      cache: "no-store",
      ...init,
      headers,
    });
  } catch (err) {
    console.error(`serverFetch error for ${url}:`, err.message);
    return new Response(
      JSON.stringify({ success: false, message: err.message, data: {} }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
