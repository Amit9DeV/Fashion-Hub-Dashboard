export function apiBase() {
  const isVercel = Boolean(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV);
  const configured = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL;

  // On Vercel, ignore localhost configurations which would crash server-side fetches
  if (isVercel && configured && (configured.includes("localhost") || configured.includes("127.0.0.1"))) {
    return "https://fashion-hub-dashboard.onrender.com/api";
  }

  return (
    configured ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:5000/api"
      : "https://fashion-hub-dashboard.onrender.com/api")
  );
}
