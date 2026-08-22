const API_URL = "https://fashion-hub-dashboard.onrender.com/api";

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    // Allows sending and receiving HTTP-only cookies
    credentials: "omit", // Wait, we use cookies? Actually, 'include' if cross-origin cookies.
  };

  // For cross-origin cookie support
  config.credentials = "include";

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || "API request failed");
  }

  return data.data || data; // Return standardized backend payload {success: true, data: {}}
}

export const api = {
  auth: {
    login: (credentials) =>
      fetchAPI("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      }),
    logout: () => fetchAPI("/auth/logout", { method: "POST" }),
    me: () => fetchAPI("/auth/me"),
  },
  products: {
    getMaster: () => fetchAPI("/products/master"),
    search: (query) => fetchAPI(`/products?query=${encodeURIComponent(query)}`),
    getAll: () => fetchAPI("/products/all"),
    getById: (id) => fetchAPI(`/products/${id}`),
    create: (data) =>
      fetchAPI("/products", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) =>
      fetchAPI(`/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id) => fetchAPI(`/products/${id}`, { method: "DELETE" }),
    addVariant: (id, data) =>
      fetchAPI(`/products/${id}/variants`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updateVariant: (id, variantId, data) =>
      fetchAPI(`/products/${id}/variants/${variantId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    deleteVariant: (id, variantId) =>
      fetchAPI(`/products/${id}/variants/${variantId}`, { method: "DELETE" }),
  },
  customers: {
    search: (query) =>
      fetchAPI(`/customers?query=${encodeURIComponent(query)}`),
    getAll: () => fetchAPI("/customers/all"),
    getById: (id) => fetchAPI(`/customers/${id}`),
  },
  sales: {
    complete: (saleData) =>
      fetchAPI("/sales", { method: "POST", body: JSON.stringify(saleData) }),
  },
  invoices: {
    getPdfUrl: (invoiceId) => `${API_URL}/invoices/${invoiceId}/pdf`,
  },
  settings: {
    update: (data) =>
      fetchAPI("/settings", { method: "POST", body: JSON.stringify(data) }),
  },
  orders: {
    getAll: () => fetchAPI("/orders"),
    getById: (id) => fetchAPI(`/orders/${id}`),
    update: (id, payload) =>
      fetchAPI(`/orders/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    delete: (id) => fetchAPI(`/orders/${id}`, { method: "DELETE" }),
  },
  returns: {
    getAll: () => fetchAPI("/returns"),
    process: (data) =>
      fetchAPI("/returns", { method: "POST", body: JSON.stringify(data) }),
  },
  reports: {
    getSales: (queryStr) => fetchAPI(`/reports/sales?${queryStr}`),
  },
  whatsapp: {
    getMessages: () => fetchAPI("/whatsapp/messages"),
    retry: (id) => fetchAPI(`/whatsapp/retry/${id}`, { method: "POST" }),
  },
};
