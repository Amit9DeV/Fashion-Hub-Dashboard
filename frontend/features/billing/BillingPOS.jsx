"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  CircleUserRound,
  Minus,
  PackageSearch,
  Plus,
  Pencil,
  ScanBarcode,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatMoney } from "@/lib/utils";
import { api } from "@/src/services/api";
import { AddProductModal } from "./AddProductModal";

const paymentOptions = ["CASH", "UPI", "CARD", "OTHER"];

function toPaisa(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : 0;
}

// ─── Inline editable field ───────────────────────────────────────────────────
function EditableField({
  value,
  onChange,
  className = "",
  inputClass = "",
  prefix = "",
  type = "text",
  align = "left",
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);

  function commit() {
    setEditing(false);
    if (draft !== value) onChange(draft);
  }

  if (editing) {
    return (
      <input
        ref={ref}
        type={type}
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className={cn(
          "rounded border border-[#c9963e] bg-[#fffcf5] px-2 py-0.5 text-sm outline-none ring-1 ring-[#c9963e]/30",
          align === "right" ? "text-right" : "text-left",
          inputClass,
        )}
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(value);
        setEditing(true);
        setTimeout(() => ref.current?.select(), 0);
      }}
      className={cn(
        "group flex items-center gap-1 hover:text-[#c9963e] transition-colors",
        align === "right" ? "flex-row-reverse" : "",
        className,
      )}
      title="Click to edit"
    >
      <span>
        {prefix}
        {value}
      </span>
      <Pencil
        size={10}
        className="opacity-0 group-hover:opacity-70 transition-opacity text-[#c9963e]"
      />
    </button>
  );
}

// ─── Cart item row with full inline editing ──────────────────────────────────
function CartItem({ item, onChange, onRemove }) {
  function update(field, rawValue) {
    if (field === "sellingPricePaisa") {
      const paisa = toPaisa(rawValue);
      onChange({
        ...item,
        sellingPricePaisa: paisa > 0 ? paisa : item.sellingPricePaisa,
      });
    } else if (field === "mrpPaisa") {
      const paisa = toPaisa(rawValue);
      onChange({ ...item, mrpPaisa: paisa > 0 ? paisa : item.mrpPaisa });
    } else if (field === "quantity") {
      const qty = parseInt(rawValue, 10);
      if (!isNaN(qty) && qty > 0)
        onChange({ ...item, quantity: Math.min(qty, item.stock) });
    } else {
      onChange({ ...item, [field]: rawValue });
    }
  }

  const mrp = item.mrpPaisa || item.sellingPricePaisa;
  const selling = item.sellingPricePaisa;
  const lineTotal = selling * item.quantity;

  // Auto-calc discount %
  const discountPct =
    mrp > selling ? Math.round(((mrp - selling) / mrp) * 100) : 0;

  return (
    <div className="p-4 border-b last:border-b-0">
      {/* ── Name + line total ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <EditableField
            value={item.productName}
            onChange={(v) => update("productName", v)}
            className="text-sm font-semibold text-left w-full"
            inputClass="w-full font-semibold"
          />
          {/* Variant chips */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
            {item.color !== undefined && (
              <EditableField
                value={item.color || ""}
                onChange={(v) => update("color", v)}
                className="text-[11px] text-[#777169]"
                inputClass="w-16 text-[11px]"
              />
            )}
            {item.size !== undefined && (
              <>
                <span className="text-[11px] text-[#bbb]">/</span>
                <EditableField
                  value={item.size || ""}
                  onChange={(v) => update("size", v)}
                  className="text-[11px] text-[#777169]"
                  inputClass="w-10 text-[11px]"
                />
              </>
            )}
            <span className="text-[11px] text-[#bbb]">·</span>
            <EditableField
              value={item.sku || ""}
              onChange={(v) => update("sku", v)}
              className="text-[11px] text-[#777169]"
              inputClass="w-24 text-[11px]"
            />
          </div>
        </div>
        <p className="font-financial text-sm font-semibold whitespace-nowrap">
          {formatMoney(lineTotal)}
        </p>
      </div>

      {/* ── Dual price row ── */}
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        {/* MRP (original price) */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] uppercase tracking-wider text-[#999] font-medium">
            MRP
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-[#aaa]">₹</span>
            <EditableField
              value={String(mrp / 100)}
              onChange={(v) => update("mrpPaisa", v)}
              type="number"
              className="text-[12px] text-[#999] line-through decoration-[#ccc]"
              inputClass="w-16 text-[12px]"
            />
          </div>
        </div>

        <div className="text-[#ddd] text-lg font-light">→</div>

        {/* Selling price */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] uppercase tracking-wider text-[#c9963e] font-medium">
            Selling Price
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-bold text-[#151515]">₹</span>
            <EditableField
              value={String(selling / 100)}
              onChange={(v) => update("sellingPricePaisa", v)}
              type="number"
              className="text-[13px] font-bold text-[#151515]"
              inputClass="w-20 text-[13px] font-bold"
            />
          </div>
        </div>

        {/* Auto discount badge */}
        {discountPct > 0 && (
          <div className="ml-auto flex items-center gap-1.5 rounded-full bg-[#eef6ea] border border-[#b8d9aa] px-2.5 py-1">
            <span className="text-[11px] font-bold text-[#3d7a29]">
              −{discountPct}% OFF
            </span>
          </div>
        )}
        {discountPct === 0 && mrp === selling && (
          <div className="ml-auto flex items-center gap-1 text-[10px] text-[#aaa]">
            <span>No discount</span>
          </div>
        )}
      </div>

      {/* ── Quantity stepper + remove ── */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center rounded-md border">
          <button
            className="grid size-7 place-items-center hover:bg-[#f0ede7] transition-colors"
            onClick={() => {
              if (item.quantity <= 1) onRemove();
              else onChange({ ...item, quantity: item.quantity - 1 });
            }}
          >
            <Minus size={14} />
          </button>
          <div className="w-8 flex justify-center">
            <EditableField
              value={String(item.quantity)}
              onChange={(v) => update("quantity", v)}
              type="number"
              className="text-sm font-semibold justify-center"
              inputClass="w-10 text-center font-semibold"
            />
          </div>
          <button
            className="grid size-7 place-items-center hover:bg-[#f0ede7] transition-colors"
            onClick={() => {
              if (item.quantity < item.stock)
                onChange({ ...item, quantity: item.quantity + 1 });
            }}
          >
            <Plus size={14} />
          </button>
        </div>
        <button
          onClick={onRemove}
          className="text-[#8a3a30] hover:text-[#5d1611] transition-colors"
          aria-label={`Remove ${item.productName}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Main BillingPOS ─────────────────────────────────────────────────────────
export function BillingPOS() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editOrderId = searchParams?.get("editOrderId");
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [customerDraft, setCustomerDraft] = useState({
    name: "",
    mobile: "",
    whatsappNumber: "",
    billingWhatsAppConsent: true,
    marketingWhatsAppConsent: false,
  });
  const [completedAt, setCompletedAt] = useState("");
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);

  // Load order data if editing
  useEffect(() => {
    if (!editOrderId) return;
    async function loadOrder() {
      setBusy(true);
      try {
        const { order, customer } = await api.orders.getById(editOrderId);
        if (order.items) {
          setCart(
            order.items.map((item) => ({
              ...item,
              stock: 999,
              sellingPricePaisa: item.unitPricePaisa,
              mrpPaisa: item.mrpPaisa || item.unitPricePaisa,
            })),
          );
        }
        if (customer) setCustomer(customer);
        if (order.discountPaisa)
          setDiscount((order.discountPaisa / 100).toString());
        if (order.payments && order.payments[0])
          setPaymentMethod(order.payments[0].method);
        if (order.completedAt) {
          setCompletedAt(new Date(order.completedAt).toISOString().split("T")[0]);
        }
      } catch (err) {
        setError("Could not load order for editing: " + err.message);
      } finally {
        setBusy(false);
      }
    }
    loadOrder();
  }, [editOrderId]);

  const subtotalPaisa = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + item.sellingPricePaisa * item.quantity,
        0,
      ),
    [cart],
  );
  const discountPaisa = Math.min(toPaisa(discount), subtotalPaisa);
  const totalPaisa = subtotalPaisa - discountPaisa;

  // Product search
  useEffect(() => {
    const timer = setTimeout(
      async () => {
        try {
          const data = await api.products.search(query);
          setResults(data.items || []);
        } catch {
          setResults([]);
        }
      },
      query ? 180 : 0,
    );
    return () => clearTimeout(timer);
  }, [query]);

  // Customer search
  useEffect(() => {
    if (!customerQuery.trim()) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await api.customers.search(customerQuery);
        setCustomerResults(data.customers || []);
      } catch {
        setCustomerResults([]);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [customerQuery]);

  function addItem(item) {
    setError("");
    setCart((current) => {
      const found = current.find((line) => line.variantId === item.variantId);
      if (found) {
        if (found.quantity >= item.stock) {
          setError("This variant has reached its available stock quantity.");
          return current;
        }
        return current.map((line) =>
          line.variantId === item.variantId
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      if (item.stock < 1) {
        setError("This variant is out of stock.");
        return current;
      }
      return [...current, { ...item, quantity: 1 }];
    });
    inputRef.current?.focus();
  }

  async function scanOrSearch(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const typed = query.trim();
    if (!typed) return;
    try {
      const data = await api.products.search(typed);
      const exact = data.items?.find(
        (item) =>
          item.barcode === typed ||
          item.sku?.toLowerCase() === typed.toLowerCase(),
      );
      if (exact) {
        addItem(exact);
        setQuery("");
      } else if (!data.items?.length)
        setError(
          `Product not found for "${typed}". Search manually or add the product first.`,
        );
      else setResults(data.items);
    } catch {
      setError(`Error searching for "${typed}".`);
    }
  }

  function updateCartItem(variantId, updated) {
    setCart((current) =>
      current.map((item) =>
        item.variantId === variantId ? { ...item, ...updated } : item,
      ),
    );
  }

  function removeCartItem(variantId) {
    setCart((current) =>
      current.filter((item) => item.variantId !== variantId),
    );
  }

  function selectCustomer(selected) {
    setCustomer(selected);
    setCustomerQuery("");
    setCustomerResults([]);
    setError("");
  }

  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );

  async function completeSale() {
    if (!cart.length)
      return setError("Add at least one product before payment.");
    setBusy(true);
    setError("");

    const draftHasDetails = Object.values(customerDraft).some(
      (value) => typeof value === "string" && value.trim(),
    );

    const payload = {
      items: cart.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        overriddenPricePaisa: item.sellingPricePaisa,
        overriddenMrpPaisa: item.mrpPaisa,
        overriddenName: item.productName,
      })),
      discountPaisa,
      payments: [{ method: paymentMethod, amountPaisa: totalPaisa }],
      customer: customer
        ? { customerId: customer._id }
        : draftHasDetails
          ? customerDraft
          : null,
      idempotencyKey,
      ...(completedAt && { completedAt: new Date(completedAt).toISOString() }),
    };

    try {
      let data;
      if (editOrderId) {
        data = await api.orders.update(editOrderId, payload);
      } else {
        data = await api.sales.complete(payload);
      }
      setSuccess(data);
      setCart([]);
      setDiscount("");
      setCustomer(null);
      setCustomerQuery("");
      setCustomerDraft({
        name: "",
        mobile: "",
        whatsappNumber: "",
        billingWhatsAppConsent: true,
        marketingWhatsAppConsent: false,
      });
      setCompletedAt("");
      setQuery("");
      setResults([]);
      setIdempotencyKey(crypto.randomUUID());
    } catch (saleError) {
      setError(saleError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
      {/* ── Left: search + catalogue ── */}
      <section className="min-w-0 space-y-5">
        <div className="rounded-md border bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-md bg-[#0b0b0b] text-[#d8b46a]">
              <ScanBarcode size={20} />
            </div>
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-3 text-[#8a847a]"
                size={17}
              />
              <Input
                ref={inputRef}
                className="h-11 pl-10"
                placeholder="Scan barcode or search product / SKU"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={scanOrSearch}
                autoFocus
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-[#777169]">
            Scan and press Enter to add instantly. Tap any field in the cart to
            edit name, price, or variant.
          </p>
        </div>

        {error && (
          <div className="flex items-start justify-between gap-3 rounded-md border border-[#e0ae9f] bg-[#fff4f0] px-4 py-3 text-sm text-[#852c21]">
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="rounded-md border bg-white">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-[#9b7740]">
                Catalogue
              </p>
              <h2 className="mt-1 text-lg font-semibold">Search results</h2>
            </div>
            <span className="rounded-full bg-[#f0ede7] px-2.5 py-1 text-xs font-medium text-[#625d54]">
              {results.length} variants
            </span>
          </div>
          <div className="grid min-h-72 grid-cols-1 gap-px bg-[#e8e3da] sm:grid-cols-2 2xl:grid-cols-3">
            {results.map((item) => (
              <button
                key={item.variantId}
                onClick={() => addItem(item)}
                disabled={!item.stock}
                className="group min-h-36 bg-white p-4 text-left transition hover:bg-[#fffcf5] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-sm bg-[#151515] px-2 py-1 text-[10px] font-semibold tracking-wide text-[#d8b46a]">
                    {item.category || "FASHION"}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      item.stock <= 0
                        ? "text-[#a53a2d]"
                        : item.stock <= 2
                          ? "text-[#9b7740]"
                          : "text-[#5d6e50]",
                    )}
                  >
                    {item.stock} in stock
                  </span>
                </div>
                <p className="mt-4 text-sm font-semibold">{item.productName}</p>
                <p className="mt-1 text-xs text-[#777169]">
                  {[item.color, item.size, item.sku]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <div className="mt-3 flex items-end justify-between">
                  <p className="font-financial text-base font-semibold">
                    {formatMoney(item.sellingPricePaisa)}
                  </p>
                  <Plus
                    className="text-[#c9963e] transition group-hover:scale-110"
                    size={18}
                  />
                </div>
              </button>
            ))}
            {!results.length && !query && (
              <div className="col-span-full grid min-h-72 place-items-center bg-white text-center">
                <div>
                  <PackageSearch className="mx-auto text-[#c9963e]" size={28} />
                  <p className="mt-3 text-sm font-medium">
                    Start with a scan or product search
                  </p>
                  <p className="mt-1 text-xs text-[#837d73]">
                    Barcode, SKU, name, brand, and category all work.
                  </p>
                </div>
              </div>
            )}
            {!results.length && query && (
              <div className="col-span-full grid min-h-72 place-items-center bg-white text-center">
                <div>
                  <PackageSearch className="mx-auto text-[#c9963e]" size={28} />
                  <p className="mt-3 text-sm font-medium">
                    No products found for "{query}"
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 border-[#c9963e] text-[#9b7740] hover:bg-[#fffcf5]"
                    onClick={() => setIsAddProductModalOpen(true)}
                  >
                    <Plus size={16} className="mr-2" /> Quick Add Product
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Right: bill sidebar ── */}
      <aside className="h-fit rounded-md border bg-white shadow-[0_10px_40px_rgba(36,30,20,0.06)] xl:sticky xl:top-5">
        <div className="border-b bg-[#151515] px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d8b46a]">
                {editOrderId ? "Editing bill" : "Current bill"}
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                {editOrderId ? "Edit mode" : "Counter sale"}
              </h2>
            </div>
            <span className="font-financial text-sm text-[#d8b46a]">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} items
            </span>
          </div>
        </div>

        {/* Edit hint banner */}
        {cart.length > 0 && (
          <div className="flex items-center gap-2 border-b bg-[#fffcf5] px-4 py-2 text-[11px] text-[#7a6030]">
            <Pencil size={11} className="text-[#c9963e]" />
            Tap any field — name, variant, price, or quantity — to edit before
            billing.
          </div>
        )}

        {/* Cart items with inline editing */}
        <div className="max-h-[420px] overflow-auto divide-y">
          {cart.map((item) => (
            <CartItem
              key={item.variantId}
              item={item}
              onChange={(updated) => updateCartItem(item.variantId, updated)}
              onRemove={() => removeCartItem(item.variantId)}
            />
          ))}
          {!cart.length && (
            <div className="grid h-40 place-items-center text-center">
              <div>
                <CircleUserRound className="mx-auto text-[#b9b1a5]" size={24} />
                <p className="mt-2 text-sm text-[#777169]">
                  Your bill is empty
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 border-t p-5">
          {/* Customer section */}
          <div className="rounded-md border border-[#e6e0d5] bg-[#faf9f6] p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8d6d39]">
                Customer
              </p>
              {customer && (
                <button
                  onClick={() => setCustomer(null)}
                  className="text-xs text-[#8a3a30]"
                >
                  Change
                </button>
              )}
            </div>
            {customer ? (
              <div className="mt-2">
                <p className="text-sm font-semibold">{customer.name}</p>
                <p className="text-xs text-[#706a61]">
                  {customer.mobile || customer.whatsappNumber} ·{" "}
                  {customer.stats?.totalOrders || 0} previous orders
                </p>
              </div>
            ) : (
              <>
                <div className="relative mt-2">
                  <Search
                    className="absolute left-2.5 top-2.5 text-[#8a847a]"
                    size={14}
                  />
                  <Input
                    className="h-9 pl-8 text-xs"
                    placeholder="Search mobile or name"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                  />
                </div>
                {customerResults.length > 0 && (
                  <div className="mt-2 overflow-hidden rounded-md border bg-white">
                    {customerResults.map((person) => (
                      <button
                        key={person._id}
                        onClick={() => selectCustomer(person)}
                        className="block w-full border-b px-3 py-2 text-left last:border-b-0 hover:bg-[#fffcf5]"
                      >
                        <p className="text-xs font-semibold">{person.name}</p>
                        <p className="text-[11px] text-[#777169]">
                          {person.mobile || person.whatsappNumber} ·{" "}
                          {formatMoney(person.stats?.totalSpentPaisa)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-[#6e552c]">
                    <UserPlus className="mr-1 inline" size={13} /> Add customer
                    details
                  </summary>
                  <div className="mt-3 space-y-2">
                    <Input
                      className="h-9 text-xs"
                      placeholder="Customer name"
                      value={customerDraft.name}
                      onChange={(e) =>
                        setCustomerDraft({
                          ...customerDraft,
                          name: e.target.value,
                        })
                      }
                    />
                    <Input
                      className="h-9 text-xs"
                      placeholder="Mobile number"
                      value={customerDraft.mobile}
                      onChange={(e) =>
                        setCustomerDraft({
                          ...customerDraft,
                          mobile: e.target.value,
                        })
                      }
                    />
                    <Input
                      className="h-9 text-xs"
                      placeholder="WhatsApp number (if different)"
                      value={customerDraft.whatsappNumber}
                      onChange={(e) =>
                        setCustomerDraft({
                          ...customerDraft,
                          whatsappNumber: e.target.value,
                        })
                      }
                    />
                    <label className="flex items-start gap-2 text-[11px] leading-4 text-[#5e584f]">
                      <input
                        type="checkbox"
                        checked={customerDraft.billingWhatsAppConsent}
                        onChange={(e) =>
                          setCustomerDraft({
                            ...customerDraft,
                            billingWhatsAppConsent: e.target.checked,
                          })
                        }
                        className="mt-0.5 accent-[#c9963e]"
                      />
                      Send this purchase bill on WhatsApp
                    </label>
                    <label className="flex items-start gap-2 text-[11px] leading-4 text-[#5e584f]">
                      <input
                        type="checkbox"
                        checked={customerDraft.marketingWhatsAppConsent}
                        onChange={(e) =>
                          setCustomerDraft({
                            ...customerDraft,
                            marketingWhatsAppConsent: e.target.checked,
                          })
                        }
                        className="mt-0.5 accent-[#c9963e]"
                      />
                      Customer agrees to offers and new arrivals on WhatsApp
                    </label>
                  </div>
                </details>
              </>
            )}
          </div>

          {/* Settings Section (Discount, Payment, Backdate) */}
          <div className="rounded-md border border-[#e6e0d5] bg-[#faf9f6] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8d6d39]">
                Options
              </p>
            </div>
            
            {/* Discount */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#5f584e]">
                Global Discount (₹)
              </span>
              <Input
                className="w-32 h-9"
                inputMode="decimal"
                placeholder="0.00"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>

            {/* Payment Method */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#5f584e]">
                Payment Method
              </span>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="h-9 w-32 rounded-md border bg-white px-2 text-sm outline-none focus:border-[#c9963e]"
              >
                {paymentOptions.map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </div>

            {/* Backdate Sale */}
            <div className="pt-2 border-t border-[#e6e0d5]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#5f584e]">
                  Backdate Sale
                </span>
                <Input
                  type="date"
                  className="w-32 h-8 text-xs bg-white"
                  value={completedAt}
                  onChange={(e) => setCompletedAt(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2 border-y py-3 text-sm">
            <div className="flex justify-between text-[#696259]">
              <span>Subtotal</span>
              <span className="font-financial">
                {formatMoney(subtotalPaisa)}
              </span>
            </div>
            {discountPaisa > 0 && (
              <div className="flex justify-between text-[#7a5c20]">
                <span>Discount</span>
                <span className="font-financial font-medium">
                  −{formatMoney(discountPaisa)}
                </span>
              </div>
            )}
            <div className="flex items-end justify-between pt-1">
              <span className="font-semibold">Total payable</span>
              <span className="font-financial text-2xl font-semibold">
                {formatMoney(totalPaisa)}
              </span>
            </div>
            <p className="text-[10px] text-[#827b72]">
              Tax is included; final tax is calculated securely by the server.
            </p>
          </div>

          <Button
            className="w-full"
            variant="gold"
            size="lg"
            onClick={completeSale}
            disabled={busy || !cart.length}
          >
            {busy ? (
              editOrderId ? (
                "Saving changes…"
              ) : (
                "Completing sale…"
              )
            ) : editOrderId ? (
              <>
                Save changes{" "}
                <ChevronDown className="rotate-[-90deg]" size={16} />
              </>
            ) : (
              <>
                Complete sale{" "}
                <ChevronDown className="rotate-[-90deg]" size={16} />
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* ── Success modal ── */}
      {success && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-5"
          onClick={() => {
            if (editOrderId) router.push("/billing");
            else {
              setSuccess(null);
              inputRef.current?.focus();
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-md bg-white p-7 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#eaf0e3] text-[#4d6842]">
              <Check size={28} />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#9b7740]">
              Sale complete
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              {success.invoiceNumber}
            </h2>
            <p className="mt-2 text-sm text-[#6e675e]">
              Inventory, immutable order, invoice, payment, and audit entry were
              saved together.
            </p>
            {success.postSaleWarning && (
              <p className="mt-4 rounded-md bg-[#fff4e5] px-3 py-2 text-xs leading-5 text-[#7d521b]">
                {success.postSaleWarning}
              </p>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" asChild>
                <a
                  href={api.invoices.getPdfUrl(success.invoiceId)}
                  target="_blank"
                >
                  View invoice
                </a>
              </Button>
              {editOrderId ? (
                <Button onClick={() => router.push("/billing")}>
                  New bill
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setSuccess(null);
                    inputRef.current?.focus();
                  }}
                >
                  New bill
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      <AddProductModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        initialQuery={query}
        onProductAdded={(item) => {
          addItem(item);
          setQuery("");
          setResults([]);
        }}
      />
    </div>
  );
}
