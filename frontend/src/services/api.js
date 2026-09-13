const API_URL ="https://fashion-hub-dashboard.onrender.com/api";
// const API_URL = "http://localhost:5000/api";
const activeRequests = new Map();

async function fetchAPI(endpoint, options = {}) {
  const isGet = !options.method || options.method === "GET";
  
  // Automatically cancel previous duplicate GET requests
  if (isGet) {
    if (activeRequests.has(endpoint)) {
      activeRequests.get(endpoint).abort();
    }
    const controller = new AbortController();
    activeRequests.set(endpoint, controller);
    options.signal = controller.signal;
  }

  const url = `${API_URL}${endpoint}`;
  const headers = {
    ...options.headers,
  };

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.error || "API request failed");
    }

    return data.data !== undefined ? data.data : data;
  } catch (error) {
    if (error.name === "AbortError") {
      // Return a never-resolving promise to stop React state updates
      return new Promise(() => {});
    }
    throw error;
  } finally {
    if (isGet && activeRequests.get(endpoint) === options.signal) {
      activeRequests.delete(endpoint);
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
    createCategory: (name) =>
      fetchAPI("/products/categories", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
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
    delete: (id) => fetchAPI(`/customers/${id}`, { method: "DELETE" }),
  },
  sales: {
    complete: (saleData) =>
      fetchAPI("/sales", { method: "POST", body: JSON.stringify(saleData) }),
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
  expenses: {
    getAll: (queryString = "") => fetchAPI(`/expenses${queryString ? `?${queryString}` : ""}`),
    create: (data) => fetchAPI("/expenses", { method: "POST", body: JSON.stringify(data) }),
    delete: (id) => fetchAPI(`/expenses/${id}`, { method: "DELETE" }),
  },
};
