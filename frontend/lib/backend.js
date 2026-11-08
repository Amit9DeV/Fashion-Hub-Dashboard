export function apiBase() {
  return (
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:5000/api"
      : "https://fashion-hub-dashboard.onrender.com/api")
  );
}
