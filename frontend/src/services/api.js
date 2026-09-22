// const API_URL =
//   process.env.NEXT_PUBLIC_API_URL || "https://fashion-hub-dashboard.onrender.com/api";
const API_URL = "https://fashion-hub-dashboard.onrender.com/api";
const activeRequests = new Map();

async function fetchAPI(endpoint, options = {}) {
  const isGet = !options.method || options.method === "GET";

  // Automatically cancel previous duplicate GET requests to prevent race conditions
  if (isGet) {
    const existingController = activeRequests.get(endpoint);
    if (existingController) {
      existingController.abort();
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
      credentials: "include", // Always send cookies for JWT auth
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.error || "API request failed");
    }

    return data.data !== undefined ? data.data : data;
  } catch (error) {
    if (error.name === "AbortError") {
      // Return a never-resolving promise to stop React state updates on aborted requests
      return new Promise(() => {});
    }
    throw error;
  } finally {
    if (isGet) {
      // Fix: compare against the stored controller (not the signal object)
      const storedController = activeRequests.get(endpoint);
      if (storedController?.signal === options.signal) {
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
    getAll: () => fetchAPI("/customers/all"),
    getById: (id) => fetchAPI(`/customers/${id}`),
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
    getAll: (page = 1, limit = 50) =>
      fetchAPI(`/orders?page=${page}&limit=${limit}`),
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
