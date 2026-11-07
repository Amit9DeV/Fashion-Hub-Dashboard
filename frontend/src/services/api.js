// ─────────────────────────────────────────────────────────────────────────────
// Fashion Hub — Client-side API Service
// Authentication is handled exclusively via HttpOnly cookies (set by the backend).
// No tokens are stored in localStorage (XSS-vulnerable).
// ─────────────────────────────────────────────────────────────────────────────

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://fashion-hub-dashboard.onrender.com/api";

// Tracks active AbortControllers per endpoint to cancel stale GET requests
const activeRequests = new Map();

async function fetchAPI(endpoint, options = {}) {
  const isGet = !options.method || options.method === "GET";

  // Cancel previous duplicate GET request to prevent race conditions
  if (isGet) {
    const existing = activeRequests.get(endpoint);
    if (existing) existing.abort();
    const controller = new AbortController();
    activeRequests.set(endpoint, controller);
    options.signal = controller.signal;
  }

  const url = `${API_URL}${endpoint}`;

  const headers = { ...options.headers };
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // Sends the HttpOnly session cookie automatically
    });

    // Handle session expiry — redirect to login
    if (response.status === 401 && typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      if (currentPath !== "/login") {
        window.location.href = `/login?next=${encodeURIComponent(currentPath)}`;
      }
      return new Promise(() => {}); // Prevent React state updates during redirect
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.error || "API request failed");
    }

    return data.data !== undefined ? data.data : data;
  } catch (error) {
    if (error.name === "AbortError") {
      // Stale request was cancelled — return a pending promise to halt updates
      return new Promise(() => {});
    }
    throw error;
  } finally {
    if (isGet) {
      const stored = activeRequests.get(endpoint);
      if (stored?.signal === options.signal) {
        activeRequests.delete(endpoint);
      }
    }
  }
}

export const api = {
  products: {
    getMaster: () => fetchAPI("/products/master"),
    createBrand: (name) =>
      fetchAPI("/products/brands", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    createCategory: (name, gender = "UNISEX") =>
      fetchAPI("/products/categories", {
        method: "POST",
        body: JSON.stringify({ name, gender }),
      }),
    search: (query) => fetchAPI(`/products?query=${encodeURIComponent(query)}`),
    getAll: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return fetchAPI(`/products/all${qs ? `?${qs}` : ""}`);
    },
    getById: (id) => fetchAPI(`/products/${id}`),
    create: (data) =>
      fetchAPI("/products", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) =>
      fetchAPI(`/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id) => fetchAPI(`/products/${id}`, { method: "DELETE" }),
    addVariant: (productId, data) =>
      fetchAPI(`/products/${productId}/variants`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateVariant: (productId, variantId, data) =>
      fetchAPI(`/products/${productId}/variants/${variantId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    deleteVariant: (productId, variantId) =>
      fetchAPI(`/products/${productId}/variants/${variantId}`, {
        method: "DELETE",
      }),
    generateBarcodes: (data) =>
      fetchAPI("/products/barcodes", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  customers: {
    search: (query) =>
      fetchAPI(`/customers?query=${encodeURIComponent(query)}`),
    getAll: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return fetchAPI(`/customers/all${qs ? `?${qs}` : ""}`);
    },
    getById: (id) => fetchAPI(`/customers/${id}`),
    create: (data) =>
      fetchAPI("/customers", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) =>
      fetchAPI(`/customers/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id) => fetchAPI(`/customers/${id}`, { method: "DELETE" }),
  },
  sales: {
    complete: (saleData) =>
      fetchAPI("/sales", { method: "POST", body: JSON.stringify(saleData) }),
    update: (id, saleData) =>
      fetchAPI(`/sales/${id}`, {
        method: "PUT",
        body: JSON.stringify(saleData),
      }),
  },
  invoices: {
    getPdfUrl: (invoiceId) => `${API_URL}/invoices/${invoiceId}/pdf`,
  },
  settings: {
    get: () => fetchAPI("/settings"),
    update: (data) =>
      fetchAPI("/settings", { method: "POST", body: JSON.stringify(data) }),
  },
  orders: {
    search: (q) => fetchAPI(`/orders/search?q=${encodeURIComponent(q)}`),
    getAll: (page = 1, limit = 50, query = "") =>
      fetchAPI(
        `/orders?page=${page}&limit=${limit}${query ? `&query=${encodeURIComponent(query)}` : ""}`
      ),
    getById: (id) => fetchAPI(`/orders/${id}`),
    update: (id, payload) =>
      fetchAPI(`/orders/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    delete: (id) => fetchAPI(`/orders/${id}`, { method: "DELETE" }),
  },
  returns: {
    getAll: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return fetchAPI(`/returns${qs ? `?${qs}` : ""}`);
    },
    getById: (id) => fetchAPI(`/returns/${id}`),
    process: (data) =>
      fetchAPI("/returns", { method: "POST", body: JSON.stringify(data) }),
    exchange: (data) =>
      fetchAPI("/returns/exchange", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  reports: {
    getSales: (queryStr) => fetchAPI(`/reports/sales?${queryStr}`),
  },
  whatsapp: {
    getMessages: () => fetchAPI("/whatsapp/messages"),
    retry: (id) => fetchAPI(`/whatsapp/retry/${id}`, { method: "POST" }),
  },
  expenses: {
    getAll: (queryString = "") =>
      fetchAPI(`/expenses${queryString ? `?${queryString}` : ""}`),
    create: (data) =>
      fetchAPI("/expenses", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) =>
      fetchAPI(`/expenses/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id) => fetchAPI(`/expenses/${id}`, { method: "DELETE" }),
  },
  cashDrawer: {
    getStatus: () => fetchAPI("/cash-drawer/status"),
    open: (data) =>
      fetchAPI("/cash-drawer/open", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    close: (data) =>
      fetchAPI("/cash-drawer/close", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  purchase: {
    createSupplier: (data) =>
      fetchAPI("/purchase/suppliers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getSuppliers: () => fetchAPI("/purchase/suppliers"),
    createOrder: (data) =>
      fetchAPI("/purchase/orders", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    receiveOrder: (id) =>
      fetchAPI(`/purchase/orders/${id}/receive`, { method: "POST" }),
  },
  cart: {
    heartbeat: (data) =>
      fetchAPI("/cart/heartbeat", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  staff: {
    getAll: () => fetchAPI("/staff"),
    create: (data) =>
      fetchAPI("/staff", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) =>
      fetchAPI(`/staff/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },
  auth: {
    login: (email, password) =>
      fetchAPI("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    logout: () => fetchAPI("/auth/logout", { method: "POST" }),
    me: () => fetchAPI("/auth/me"),
  },
};
