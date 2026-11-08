"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  CircleUserRound,
  Clock,
  HandCoins,
  Minus,
  PackageSearch,
  Plus,
  Pencil,
  Receipt,
  RotateCcw,
  ScanBarcode,
  Search,
  Trash2,
  UserPlus,
  Vault,
  Volume2,
  VolumeX,
  X,
  Keyboard,
  QrCode,
  Percent,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatMoney } from "@/lib/utils";
import { api } from "@/src/services/api";
import { toast } from "sonner";
import { AddProductModal } from "./AddProductModal";
import { CashDrawerModal } from "./CashDrawerModal";
import { HeldCartsModal } from "./HeldCartsModal";
import { UpiQrModal } from "./UpiQrModal";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { CameraScannerModal } from "./CameraScannerModal";
import InvoiceModal from "@/components/invoice/InvoiceModal";
import SettleDuesModal from "@/components/customers/SettleDuesModal";

const paymentOptions = ["CASH", "UPI", "CARD", "OTHER"];

function toPaisa(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : 0;
}

function playPosBeep(type = "success", enabled = true) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    }
  } catch {}
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
  const customerId = searchParams?.get("customerId");
  const exchangeCreditParam = searchParams?.get("exchangeCredit");
  const exchangeCreditPaisa = useMemo(() => {
    const p = parseInt(exchangeCreditParam, 10);
    return !isNaN(p) && p > 0 ? p : 0;
  }, [exchangeCreditParam]);
  const [exchangeApplied, setExchangeApplied] = useState(false);
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
  const originalCompletedAt = useRef(null);
  const [discount, setDiscount] = useState("");
  const [discountMode, setDiscountMode] = useState("FLAT"); // "FLAT" | "PERCENT"
  const [discountPercent, setDiscountPercent] = useState("");
  const [payments, setPayments] = useState([{ method: "UPI", amount: "" }]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);
  const [lastSaleSummary, setLastSaleSummary] = useState(null);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isCashDrawerOpen, setIsCashDrawerOpen] = useState(false);
  const [isUpiQrModalOpen, setIsUpiQrModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [heldCarts, setHeldCarts] = useState([]);
  const [isHeldCartsModalOpen, setIsHeldCartsModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [storeSettings, setStoreSettings] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );

  const subtotalPaisa = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + item.sellingPricePaisa * item.quantity,
        0,
      ),
    [cart],
  );
  const discountPaisa = useMemo(() => {
    if (discountMode === "PERCENT") {
      const pct = parseFloat(discountPercent) || 0;
      return Math.min(Math.round((subtotalPaisa * pct) / 100), subtotalPaisa);
    }
    return Math.min(toPaisa(discount), subtotalPaisa);
  }, [discountMode, discountPercent, discount, subtotalPaisa]);
  const totalPaisa = subtotalPaisa - discountPaisa;

  const taxRate = storeSettings?.taxRate ?? 5;
  const estimatedTaxPaisa = useMemo(() => {
    if (totalPaisa <= 0 || !taxRate) return 0;
    return Math.round(totalPaisa - (totalPaisa / (1 + taxRate / 100)));
  }, [totalPaisa, taxRate]);
  const cgstPaisa = Math.round(estimatedTaxPaisa / 2);
  const sgstPaisa = estimatedTaxPaisa - cgstPaisa;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fh_held_carts");
      if (saved) setHeldCarts(JSON.parse(saved));
    } catch {}
    api.settings.get().then((res) => {
      if (res?.settings) setStoreSettings(res.settings);
    }).catch(() => {});
  }, []);

  const handleHoldCart = () => {
    if (!cart.length) {
      toast.warning("Cart is empty. Add products before parking.");
      return;
    }
    const newHeld = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      cart,
      customer,
      customerDraft,
      discount,
      payments,
      totalPaisa,
    };
    const updated = [newHeld, ...heldCarts];
    setHeldCarts(updated);
    try {
      localStorage.setItem("fh_held_carts", JSON.stringify(updated));
    } catch {}
    setCart([]);
    setCustomer(null);
    setCustomerDraft({
      name: "",
      mobile: "",
      whatsappNumber: "",
      billingWhatsAppConsent: true,
      marketingWhatsAppConsent: false,
    });
    setDiscount("");
    setPayments([{ method: "UPI", amount: "" }]);
    toast.success("Bill parked on hold. You can resume it anytime.");
  };

  const handleResumeCart = (held) => {
    if (cart.length > 0) {
      if (!confirm("Your current bill has items. Replace it with the parked bill?")) {
        return;
      }
    }
    setCart(held.cart || []);
    setCustomer(held.customer || null);
    if (held.customerDraft) setCustomerDraft(held.customerDraft);
    if (held.discount) setDiscount(held.discount);
    if (held.payments?.length) setPayments(held.payments);

    const updated = heldCarts.filter((h) => h.id !== held.id);
    setHeldCarts(updated);
    try {
      localStorage.setItem("fh_held_carts", JSON.stringify(updated));
    } catch {}
    setIsHeldCartsModalOpen(false);
    toast.success("Parked bill restored to register!");
  };

  const handleDeleteHeldCart = (heldId) => {
    const updated = heldCarts.filter((h) => h.id !== heldId);
    setHeldCarts(updated);
    try {
      localStorage.setItem("fh_held_carts", JSON.stringify(updated));
    } catch {}
    toast.success("Parked bill removed.");
  };

  const handleClearAllHeld = () => {
    if (!confirm("Are you sure you want to clear all parked bills?")) return;
    setHeldCarts([]);
    try {
      localStorage.removeItem("fh_held_carts");
    } catch {}
    setIsHeldCartsModalOpen(false);
    toast.success("All parked bills cleared.");
  };

  const handleClearCart = () => {
    if (!cart.length) return;
    if (!confirm("Are you sure you want to clear the current bill?")) return;
    setCart([]);
    setDiscount("");
    setPayments([{ method: "UPI", amount: "" }]);
    setCustomer(null);
    setQuery("");
    setResults([]);
    toast.info("Cart cleared.");
  };

  const handleScannedBarcode = async (scannedCode) => {
    if (!scannedCode) return;
    const clean = scannedCode.trim();
    try {
      const data = await api.products.search(clean);
      const exact =
        data.items?.find(
          (item) =>
            item.barcode === clean ||
            item.sku?.toLowerCase() === clean.toLowerCase()
        ) || data.items?.[0];

      if (exact) {
        addItem(exact);
        playPosBeep("success", soundEnabled);
        toast.success(`Scanned: ${exact.productName} (${exact.sku})`);
        setIsCameraModalOpen(false);
      } else {
        playPosBeep("error", soundEnabled);
        toast.error(`Barcode "${clean}" not found`);
      }
    } catch {
      playPosBeep("error", soundEnabled);
      toast.error(`Barcode scan failed for "${clean}"`);
    }
  };

  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    function handleGlobalKeyDown(e) {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInputFocused = activeTag === "input" || activeTag === "textarea" || activeTag === "select";

      // 1. Hotkeys
      if (e.key === "F1") {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      } else if (e.key === "F2") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      } else if (e.key === "F4") {
        e.preventDefault();
        if (cart.length > 0 && !busy) completeSale();
        return;
      } else if (e.key === "F8") {
        e.preventDefault();
        setIsCashDrawerOpen((prev) => !prev);
        return;
      } else if (e.key === "F9") {
        e.preventDefault();
        if (totalPaisa > 0) setIsUpiQrModalOpen((prev) => !prev);
        return;
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }

      // 2. Hardware Barcode Scanner burst detection (when not typing in an input)
      if (!isInputFocused) {
        const now = Date.now();
        const timeDiff = now - lastKeyTime;
        lastKeyTime = now;

        if (e.key === "Enter") {
          if (barcodeBuffer.length >= 3 && timeDiff < 200) {
            e.preventDefault();
            const scannedCode = barcodeBuffer.trim();
            barcodeBuffer = "";
            handleScannedBarcode(scannedCode);
          }
          barcodeBuffer = "";
          return;
        }

        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (timeDiff > 120) {
            barcodeBuffer = e.key;
          } else {
            barcodeBuffer += e.key;
          }
        }
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [cart, busy, totalPaisa, soundEnabled]);

  useEffect(() => {
    if (!customerId) return;
    async function loadCustomer() {
      try {
        const data = await api.customers.getById(customerId);
        const cust = data?.customer || data;
        if (cust) {
          setCustomer(cust);
          toast.success(`Selected customer: ${cust.name || cust.mobile}`);
        }
      } catch (err) {
        console.error("Could not load customer for sale:", err);
      }
    }
    loadCustomer();
  }, [customerId]);

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
              // Use real current stock + original qty so the cashier can restore
              // the original amount without triggering a false 'out of stock' error.
              // The backend will validate actual stock atomically on submit.
              stock: (item.currentStock || 0) + item.quantity,
              sellingPricePaisa: item.unitPricePaisa,
              mrpPaisa: item.mrpPaisa || item.unitPricePaisa,
            })),
          );
        }
        if (customer) setCustomer(customer);
        if (order.discountPaisa)
          setDiscount((order.discountPaisa / 100).toString());
        if (order.payments && order.payments.length > 0) {
          setPayments(
            order.payments.map((p) => ({
              method: p.method,
              amount: (p.amountPaisa / 100).toString(),
            }))
          );
        }
        if (order.completedAt) {
          originalCompletedAt.current = order.completedAt;
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
    let added = false;
    setCart((current) => {
      const found = current.find((line) => line.variantId === item.variantId);
      if (found) {
        if (found.quantity >= item.stock) {
          setError("This variant has reached its available stock quantity.");
          playPosBeep("error", soundEnabled);
          return current;
        }
        added = true;
        return current.map((line) =>
          line.variantId === item.variantId
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      if (item.stock < 1) {
        setError("This variant is out of stock.");
        playPosBeep("error", soundEnabled);
        return current;
      }
      added = true;
      return [...current, { ...item, quantity: 1 }];
    });
    if (added) playPosBeep("success", soundEnabled);
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
      } else if (!data.items?.length) {
        playPosBeep("error", soundEnabled);
        setError(
          `Product not found for "${typed}". Search manually or add the product first.`,
        );
      } else {
        setResults(data.items);
      }
    } catch {
      playPosBeep("error", soundEnabled);
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

  async function completeSale() {
    if (!cart.length)
      return setError("Add at least one product before payment.");
    setBusy(true);
    setError("");

    const draftHasDetails = Object.values(customerDraft).some(
      (value) => typeof value === "string" && value.trim(),
    );

    let finalPayments = payments
      .map((p) => ({
        method: p.method,
        amountPaisa: toPaisa(p.amount),
      }))
      .filter((p) => p.amountPaisa > 0);

    if (finalPayments.length === 0 && payments.length === 1 && payments[0].amount === "") {
      finalPayments = [{ method: payments[0].method, amountPaisa: totalPaisa }];
    }

    if (finalPayments.length === 0) {
      setBusy(false);
      return setError("Please provide at least one payment method or amount.");
    }

    const totalPaid = finalPayments.reduce((sum, p) => sum + p.amountPaisa, 0);
    let changeGivenPaisa = 0;

    if (totalPaid > totalPaisa) {
      const cashEntry = finalPayments.find((p) => p.method === "CASH");
      if (cashEntry) {
        changeGivenPaisa = totalPaid - totalPaisa;
        // Cap recorded cash payment so ledger balances exactly
        cashEntry.amountPaisa = Math.max(0, cashEntry.amountPaisa - changeGivenPaisa);
      } else {
        setBusy(false);
        return setError("Payment amount exceeds total payable. Please check entered amounts.");
      }
    }

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
      payments: finalPayments,
      customer: customer
        ? { customerId: customer._id }
        : draftHasDetails
          ? customerDraft
          : null,
      idempotencyKey,
      // Send full ISO datetime string. If the user didn't change the date, preserve the original exact time.
      ...(completedAt && { 
        completedAt: originalCompletedAt.current && originalCompletedAt.current.startsWith(completedAt)
          ? originalCompletedAt.current
          : new Date(completedAt).toISOString()
      }),
    };

    try {
      let data;
      if (editOrderId) {
        data = await api.orders.update(editOrderId, payload);
        toast.success("Order updated successfully");
      } else {
        data = await api.sales.complete(payload);
        toast.success("Order completed successfully");
      }
      setLastSaleSummary({
        changeGivenPaisa,
        totalPaidPaisa: totalPaid,
        billTotalPaisa: totalPaisa,
      });
      setSuccess(data);
      setCart([]);
      setDiscount("");
      setPayments([{ method: "UPI", amount: "" }]);
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px] pb-24 xl:pb-6">
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCameraModalOpen(true)}
              className="h-11 border-[#dfd8cc] text-[#5f584e] hover:bg-[#faf9f6] flex items-center gap-1.5 px-2.5 sm:px-3"
              title="Scan Barcode with Camera"
            >
              <Camera size={16} className="text-[#1a3a7a]" />
              <span className="hidden lg:inline font-medium text-xs">Camera</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCashDrawerOpen(true)}
              className="h-11 border-[#d8c3a5] text-[#2c2724] hover:bg-[#faf7f2] flex items-center gap-1.5 px-3"
              title="Open / Close Shift Cash Drawer (F8)"
            >
              <Vault size={16} className="text-[#c9963e]" />
              <span className="hidden sm:inline font-medium text-xs">Cash Drawer</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsShortcutsModalOpen(true)}
              className="h-11 border-[#dfd8cc] text-[#5f584e] hover:bg-[#faf9f6] flex items-center gap-1.5 px-2.5 sm:px-3"
              title="POS Keyboard Shortcuts (F1)"
            >
              <Keyboard size={15} className="text-[#8a847a]" />
              <span className="hidden md:inline font-medium text-xs">Help (F1)</span>
            </Button>
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
      <aside id="checkout-sidebar" className="h-fit rounded-md border bg-white shadow-[0_10px_40px_rgba(36,30,20,0.06)] xl:sticky xl:top-5">
        <div className="border-b bg-[#151515] px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d8b46a]">
                {editOrderId ? "✏ Editing existing bill" : "Current bill"}
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                {editOrderId ? "Edit mode" : "Counter sale"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSoundEnabled((prev) => !prev)}
                className={`p-1.5 rounded transition-colors ${
                  soundEnabled ? "text-[#d8b46a] hover:bg-white/10" : "text-[#706a61] hover:bg-white/5"
                }`}
                title={soundEnabled ? "Scanner sound on (click to mute)" : "Scanner sound muted (click to unmute)"}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              <span className="font-financial text-sm text-[#d8b46a] bg-white/5 px-2 py-0.5 rounded">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>
          </div>

          {/* Quick Cart Actions Bar */}
          <div className="mt-3 flex items-center justify-between gap-1.5 border-t border-white/10 pt-2.5 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleHoldCart}
                disabled={!cart.length}
                className="inline-flex items-center gap-1 rounded bg-[#2a2520] hover:bg-[#3d352b] px-2.5 py-1 text-[11px] font-medium text-[#d8b46a] border border-[#4a3f30] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                title="Park current bill on hold"
              >
                <Clock size={12} />
                Park Bill
              </button>
              <button
                type="button"
                onClick={() => setIsHeldCartsModalOpen(true)}
                className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium border transition-colors ${
                  heldCarts.length > 0
                    ? "bg-[#c9963e]/20 border-[#c9963e] text-[#f2d08a] hover:bg-[#c9963e]/30"
                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                }`}
                title="View parked bills"
              >
                Held Bills ({heldCarts.length})
              </button>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="text-[11px] text-[#ff8a80] hover:text-[#ff5252] hover:underline transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {editOrderId && (
            <div className="mt-2 rounded bg-[#2a1f00] border border-[#5a3e00] px-3 py-1.5 text-[10px] text-[#d8b46a]">
              ⚠ Modifying order — stock, customer stats & invoice will be recalculated on save.
            </div>
          )}
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
          {/* Exchange Credit Banner */}
          {exchangeCreditPaisa > 0 && (
            <div className="rounded-md border border-[#c9963e]/50 bg-[#fffcf5] p-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#8a5a10]">Garment Exchange Credit</p>
                  <p className="font-financial font-bold text-sm text-[#0b0b0b] mt-0.5">
                    {formatMoney(exchangeCreditPaisa)}
                  </p>
                </div>
                {!exchangeApplied ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="gold"
                    className="h-7 text-xs px-2.5 font-semibold"
                    onClick={() => {
                      setDiscount((exchangeCreditPaisa / 100).toString());
                      setExchangeApplied(true);
                      toast.success(`Applied ₹${(exchangeCreditPaisa / 100).toFixed(2)} exchange credit as bill discount`);
                    }}
                  >
                    Apply Credit
                  </Button>
                ) : (
                  <span className="rounded bg-[#eaf5ed] border border-[#a3d9b8] px-2 py-0.5 text-[10px] font-bold text-[#1a6b3a]">
                    APPLIED
                  </span>
                )}
              </div>
            </div>
          )}

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
                {customer.stats?.totalDuesPaisa > 0 && (
                  <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between rounded bg-[#fff0f0] border border-[#f5c6cb] p-2.5 text-xs text-[#721c24] gap-2">
                    <div>
                      <span className="font-medium">Prior Outstanding Dues: </span>
                      <span className="font-financial font-bold text-sm block sm:inline">
                        {formatMoney(customer.stats.totalDuesPaisa)}
                      </span>
                    </div>
                    <div className="shrink-0">
                      <SettleDuesModal
                        customer={customer}
                        onSuccess={(data) => {
                          setCustomer((prev) => ({
                            ...prev,
                            stats: {
                              ...prev.stats,
                              totalDuesPaisa: data.remainingDuesPaisa,
                            },
                          }));
                        }}
                      />
                    </div>
                  </div>
                )}
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!customerDraft.name && !customerDraft.mobile) {
                          toast.warning("Please provide at least a customer name or mobile number");
                          return;
                        }
                        try {
                          const res = await api.customers.create(customerDraft);
                          const created = res.data?.customer || res.customer || res;
                          if (created) {
                            setCustomer(created);
                            setCustomerDraft({
                              name: "",
                              mobile: "",
                              whatsappNumber: "",
                              billingWhatsAppConsent: true,
                              marketingWhatsAppConsent: false,
                            });
                            toast.success(`Customer ${created.name || created.mobile} saved & attached!`);
                          }
                        } catch (err) {
                          toast.error(err.message || "Failed to save customer");
                        }
                      }}
                      className="w-full h-8 text-xs border-[#c9963e] text-[#8a5a10] hover:bg-[#fffcf5] mt-1"
                    >
                      <UserPlus size={13} className="mr-1.5" /> Save &amp; Select Customer
                    </Button>
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">
                  Bill Discount
                </span>
                <div className="inline-flex rounded-md border border-[#dfd8cc] p-0.5 bg-white text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDiscountMode("FLAT")}
                    className={`px-2 py-0.5 rounded font-medium transition-colors ${
                      discountMode === "FLAT" ? "bg-[#0b0b0b] text-white" : "text-[#706a61] hover:text-[#0b0b0b]"
                    }`}
                  >
                    ₹ Flat
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountMode("PERCENT")}
                    className={`px-2 py-0.5 rounded font-medium transition-colors ${
                      discountMode === "PERCENT" ? "bg-[#0b0b0b] text-white" : "text-[#706a61] hover:text-[#0b0b0b]"
                    }`}
                  >
                    % Percent
                  </button>
                </div>
              </div>

              {/* Quick % discount presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setDiscountMode("PERCENT");
                      setDiscountPercent(String(pct));
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors ${
                      discountMode === "PERCENT" && discountPercent === String(pct)
                        ? "bg-[#c9963e] text-white border-[#c9963e]"
                        : "bg-white text-[#706a61] border-[#dfd8cc] hover:border-[#c9963e]"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
                {(discount || discountPercent) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDiscount("");
                      setDiscountPercent("");
                    }}
                    className="text-[10px] text-[#8a3a30] hover:underline ml-auto font-medium"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-2 text-xs text-[#8a847a] font-medium">
                    {discountMode === "PERCENT" ? "%" : "₹"}
                  </span>
                  <Input
                    className="h-8 pl-6 text-xs bg-white"
                    inputMode="decimal"
                    placeholder={discountMode === "PERCENT" ? "e.g. 10" : "0.00"}
                    value={discountMode === "PERCENT" ? discountPercent : discount}
                    onChange={(e) => {
                      if (discountMode === "PERCENT") setDiscountPercent(e.target.value);
                      else setDiscount(e.target.value);
                    }}
                  />
                </div>
                {discountPaisa > 0 && (
                  <span className="font-financial text-xs font-semibold text-[#8a5a10] whitespace-nowrap">
                    −{formatMoney(discountPaisa)}
                  </span>
                )}
              </div>
            </div>

            {/* Payments */}
            <div className="space-y-2 pt-2 border-t border-[#e6e0d5]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#5f584e]">Payments</span>
                {payments.length < 4 && (
                  <button
                    onClick={() => setPayments([...payments, { method: "CASH", amount: "" }])}
                    className="text-xs text-[#c9963e] hover:underline font-medium"
                  >
                    + Split Payment
                  </button>
                )}
              </div>

              {/* Quick Pay Presets */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setPayments([{ method: "UPI", amount: (totalPaisa / 100).toString() }]);
                    setIsUpiQrModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded text-[11px] font-semibold bg-[#eef4ff] text-[#1a3a7a] border border-[#c5d7ff] hover:bg-[#dce8ff] transition-colors flex items-center gap-1"
                  title="Generate dynamic counter UPI QR Code (F9)"
                >
                  <QrCode size={12} />
                  ⚡ UPI QR (F9)
                </button>
                <button
                  type="button"
                  onClick={() => setPayments([{ method: "UPI", amount: (totalPaisa / 100).toString() }])}
                  className="px-2.5 py-1 rounded text-[11px] font-semibold bg-[#f0f4fc] text-[#1a3a7a] border border-[#d0dcf5] hover:bg-[#e4ecfb] transition-colors"
                >
                  Full UPI
                </button>
                <button
                  type="button"
                  onClick={() => setPayments([{ method: "CASH", amount: (totalPaisa / 100).toString() }])}
                  className="px-2.5 py-1 rounded text-[11px] font-semibold bg-[#f0f9f4] text-[#1a6b3a] border border-[#a3d9b8] hover:bg-[#dcf3e5] transition-colors"
                >
                  Full Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPayments([{ method: "CARD", amount: (totalPaisa / 100).toString() }])}
                  className="px-2.5 py-1 rounded text-[11px] font-semibold bg-[#faf5ff] text-[#5a2a7a] border border-[#e2ccff] hover:bg-[#f3e8ff] transition-colors"
                >
                  Full Card
                </button>
              </div>

              {payments.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={p.method}
                    onChange={(e) => {
                      const newP = [...payments];
                      newP[idx].method = e.target.value;
                      setPayments(newP);
                    }}
                    className="h-8 flex-1 rounded-md border bg-white px-2 text-xs outline-none focus:border-[#c9963e]"
                  >
                    {paymentOptions.map((method) => (
                      <option key={method}>{method}</option>
                    ))}
                  </select>
                  <Input
                    className="h-8 w-24 text-xs bg-white"
                    placeholder="Amt (₹)"
                    type="number"
                    value={p.amount}
                    onChange={(e) => {
                      const newP = [...payments];
                      newP[idx].amount = e.target.value;
                      setPayments(newP);
                    }}
                  />
                  {payments.length > 1 && (
                    <button
                      onClick={() => setPayments(payments.filter((_, i) => i !== idx))}
                      className="text-[#8a3a30] hover:text-[#5d1611]"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {(() => {
                const totalPaidPaisa = payments.reduce((sum, p) => sum + toPaisa(p.amount), 0);
                const isAutoFull = payments.length === 1 && payments[0].amount === "";
                const effectivePaid = isAutoFull ? totalPaisa : totalPaidPaisa;
                const balanceDue = totalPaisa - effectivePaid;
                
                if (balanceDue > 0 && !isAutoFull) {
                  return (
                    <div className="flex justify-between items-center text-xs text-[#8a3a30] font-medium pt-1 px-2.5 py-1.5 rounded bg-[#fff0ec] border border-[#f5c6cb]">
                      <span>Balance Due (Dues):</span>
                      <span className="font-financial font-bold">{formatMoney(balanceDue)}</span>
                    </div>
                  );
                } else if (balanceDue < 0) {
                  const hasCash = payments.some(p => p.method === "CASH");
                  return (
                    <div className="flex justify-between items-center text-xs font-semibold pt-1 px-2.5 py-1.5 rounded bg-[#f0f9f4] border border-[#a3d9b8] text-[#1a6b3a]">
                      <span>{hasCash ? "💵 Change to return:" : "Excess amount:"}</span>
                      <span className="font-financial text-sm font-bold">{formatMoney(Math.abs(balanceDue))}</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Backdate Sale */}
            <div className="pt-2 border-t border-[#e6e0d5]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#5f584e]">
                  Backdate Sale
                </span>
                <Input
                  type="date"
                  className="w-36 h-8 text-xs bg-white"
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
            <div className="flex justify-between text-xs text-[#706a61] pt-0.5">
              <span>Included GST ({taxRate}%)</span>
              <span className="font-financial font-medium">
                {formatMoney(estimatedTaxPaisa)}
              </span>
            </div>
            {estimatedTaxPaisa > 0 && (
              <div className="flex justify-between text-[11px] text-[#8a847a]">
                <span className="pl-2">CGST ({(taxRate / 2).toFixed(1)}%) + SGST ({(taxRate / 2).toFixed(1)}%)</span>
                <span className="font-financial">
                  {formatMoney(cgstPaisa)} + {formatMoney(sgstPaisa)}
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

      {/* ── Mobile Floating Cart Bar ── */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-[#151515]/95 backdrop-blur-md text-white px-4 py-3 border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.35)] flex items-center justify-between xl:hidden">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#d8b46a]">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} {cart.reduce((sum, item) => sum + item.quantity, 0) === 1 ? "item" : "items"} in bill
            </span>
            <span className="font-financial text-lg font-bold text-white leading-tight">
              {formatMoney(totalPaisa)}
            </span>
          </div>
          <Button
            variant="gold"
            size="sm"
            className="h-9 px-4 text-xs font-semibold shadow-md active:scale-95 transition-transform"
            onClick={() => {
              const el = document.getElementById("checkout-sidebar");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Review & Pay
            <ChevronDown className="ml-1 rotate-[-90deg]" size={14} />
          </Button>
        </div>
      )}

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
              {editOrderId ? "Order updated" : "Sale complete"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              {success.invoiceNumber}
            </h2>
            <p className="mt-2 text-sm text-[#6e675e]">
              {editOrderId
                ? "Order, invoice, stock, and audit entry have been updated."
                : "Inventory, immutable order, invoice, payment, and audit entry were saved together."
              }
            </p>
            {lastSaleSummary?.changeGivenPaisa > 0 && (
              <div className="my-4 rounded-md bg-[#f0f9f4] border border-[#a3d9b8] p-3 text-center">
                <p className="text-[10px] uppercase font-bold tracking-wider text-[#1a6b3a]">Change Returned to Customer</p>
                <p className="font-financial text-2xl font-bold text-[#1a6b3a] mt-0.5">
                  {formatMoney(lastSaleSummary.changeGivenPaisa)}
                </p>
              </div>
            )}
            {success.postSaleWarning && (
              <p className="mt-4 rounded-md bg-[#fff4e5] px-3 py-2 text-xs leading-5 text-[#7d521b]">
                {success.postSaleWarning}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <Button
                variant="gold"
                onClick={() => setIsInvoiceModalOpen(true)}
                className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm h-9"
              >
                <Receipt size={15} /> Print / Preview Invoice
              </Button>
              <Button variant="outline" asChild className="text-xs sm:text-sm h-9">
                <a
                  href={api.invoices.getPdfUrl(success.invoiceId)}
                  target="_blank"
                >
                  Download PDF
                </a>
              </Button>
              {editOrderId ? (
                <Button variant="outline" onClick={() => router.push("/orders")} className="text-xs sm:text-sm h-9">
                  Back to Orders
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSuccess(null);
                    inputRef.current?.focus();
                  }}
                  className="text-xs sm:text-sm h-9"
                >
                  New bill
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        invoiceId={success?.invoiceId}
        orderId={success?.orderId}
      />
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
      <CashDrawerModal
        isOpen={isCashDrawerOpen}
        onClose={() => setIsCashDrawerOpen(false)}
      />
      <HeldCartsModal
        isOpen={isHeldCartsModalOpen}
        onClose={() => setIsHeldCartsModalOpen(false)}
        heldCarts={heldCarts}
        onResume={handleResumeCart}
        onDelete={handleDeleteHeldCart}
        onClearAll={handleClearAllHeld}
      />
      <UpiQrModal
        isOpen={isUpiQrModalOpen}
        onClose={() => setIsUpiQrModalOpen(false)}
        amountPaisa={totalPaisa}
        upiId={storeSettings?.upiId}
        storeName={storeSettings?.storeName || "Fashion Hub"}
        onPaymentConfirmed={() => {
          setPayments([{ method: "UPI", amount: (totalPaisa / 100).toString() }]);
          toast.success("UPI payment recorded for this bill.");
        }}
      />
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
      <CameraScannerModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onScan={handleScannedBarcode}
      />
    </div>
  );
}
