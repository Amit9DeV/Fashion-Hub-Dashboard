export function apiBase() {
  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
  const configured = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL;

  // A production frontend must be explicitly connected to its backend.
  if (isVercel && configured && (configured.includes("localhost") || configured.includes("127.0.0.1"))) {
    throw new Error("BACKEND_API_URL must not point to localhost in a Vercel deployment.");
  }

  if (configured) return configured;
  if (process.env.NODE_ENV === "development") return "http://localhost:5000/api";
  throw new Error("BACKEND_API_URL must be configured for this deployment.");
}
