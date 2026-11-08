import { cookies } from "next/headers";
import { apiBase } from "./backend";

export async function serverFetch(endpoint, init = {}) {
  let authToken = null;

  try {
    const cookieStore = await cookies();
    authToken = cookieStore.get("fashion_hub_session")?.value;
  } catch (err) {
    // In case cookies() cannot be accessed
  }

  const configuredApi = apiBase().replace(/\/+$/, "");
  const backendOrigin = configuredApi.replace(/\/api\/?$/i, "");

  let targetUrl = endpoint;
  if (!endpoint.startsWith("http")) {
    const cleanEndpoint = endpoint.replace(/^\/+/, "");
    const apiPath = cleanEndpoint.startsWith("api/")
      ? cleanEndpoint
      : `api/${cleanEndpoint}`;
    targetUrl = `${backendOrigin}/${apiPath}`;
  }

  const headers = {
    Accept: "application/json",
    ...(authToken
      ? {
          Authorization: `Bearer ${authToken}`,
          Cookie: `fashion_hub_session=${authToken}`,
        }
      : {}),
    ...(init.headers || {}),
  };

  try {
    return await fetch(targetUrl, {
      cache: "no-store",
      ...init,
      headers,
    });
  } catch (err) {
    console.error(`serverFetch error for ${targetUrl}:`, err.message);
    return new Response(
      JSON.stringify({ success: false, message: err.message, data: {} }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
