export function apiBase() {
  return (
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://fashion-hub-dashboard.onrender.com/api"
  );
}
