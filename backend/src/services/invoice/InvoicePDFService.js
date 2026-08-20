import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import connectToDatabase from "../../config/db.js";
import Invoice from "../../models/Invoice.js";
import Settings from "../../models/Settings.js";
import { STORE } from "../../utils/store.js";

const INVOICE_DIR = path.join(process.cwd(), "storage", "invoices");

// ── Palette ──────────────────────────────────────────────────────────────────
const BLACK  = "#0B0B0B";
const DARK   = "#1A1A1A";
const GOLD   = "#C9963E";
const WHITE  = "#FFFFFF";
const MUTED  = "#999999";
const LGREY  = "#CCCCCC";

function safeFileName(n) { return n.replace(/[^a-zA-Z0-9-_]/g, "-"); }

// ── Register system Arial fonts (supports ₹) ──────────────────────────────────
const FONT_MAP = {
  reg:    "C:/Windows/Fonts/arial.ttf",
  bold:   "C:/Windows/Fonts/arialbd.ttf",
  italic: "C:/Windows/Fonts/ariali.ttf",
};
const HAS_ARIAL = Object.values(FONT_MAP).every(existsSync);
const F    = HAS_ARIAL ? "FH"        : "Helvetica";
const FB   = HAS_ARIAL ? "FH-Bold"   : "Helvetica-Bold";
const FI   = HAS_ARIAL ? "FH-Italic" : "Helvetica-Oblique";

const F_SERIF = "Times-Roman";
const F_SERIF_B = "Times-Bold";
const F_SERIF_I = "Times-Italic";

function registerFonts(doc) {
  if (!HAS_ARIAL) return;
  doc.registerFont(F,  FONT_MAP.reg);
  doc.registerFont(FB, FONT_MAP.bold);
  doc.registerFont(FI, FONT_MAP.italic);
}

// ── Currency formatter ─────────────────────────────────────────────────────────
function fmt(paisa = 0) {
  const n = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(paisa / 100);
  return HAS_ARIAL ? `\u20B9${n}` : `Rs.${n}`;  // ₹ only when font supports it
}

// ══════════════════════════════════════════════════════════════════════════════
//  DRAW HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/** Workaround for pdfkit align: 'center' shifting right when characterSpacing is used */
function drawCentered(doc, text, y, opts = {}) {
  // widthOfString usually accounts for characterSpacing if passed in opts
  const w = doc.widthOfString(text, opts);
  const x = (595.28 - w) / 2;
  doc.text(text, x, y, opts);
}

/** Clothes hanger centered at (cx, topY) */
function drawHanger(doc, cx, topY, color) {
  doc.save().lineWidth(1.6).strokeColor(color).lineCap("round").lineJoin("round");
  // Hook (small J-curve, tilted right)
  doc.moveTo(cx, topY + 12)
     .bezierCurveTo(cx, topY + 4, cx + 8, topY - 2, cx + 14, topY + 2)
     .bezierCurveTo(cx + 20, topY + 6, cx + 18, topY + 14, cx + 10, topY + 14)
     .stroke();
  // Neck
  doc.moveTo(cx, topY + 12).lineTo(cx, topY + 22).stroke();
  // Left arm (smooth arc)
  doc.moveTo(cx, topY + 22)
     .bezierCurveTo(cx - 5, topY + 28, cx - 32, topY + 38, cx - 40, topY + 44)
     .stroke();
  // Right arm
  doc.moveTo(cx, topY + 22)
     .bezierCurveTo(cx + 5, topY + 28, cx + 32, topY + 38, cx + 40, topY + 44)
     .stroke();
  // Horizontal bar
  doc.moveTo(cx - 40, topY + 44).lineTo(cx + 40, topY + 44).stroke();
  doc.restore();
}

/** Pentagon shield outline */
function drawShield(doc, cx, cy, sz, color) {
  doc.save().lineWidth(1.4).strokeColor(color);
  const hw = sz * 0.72, hh = sz, bh = sz * 0.25;
  doc.moveTo(cx, cy - hh)
     .lineTo(cx + hw, cy - hh * 0.4)
     .lineTo(cx + hw, cy + bh)
     .bezierCurveTo(cx + hw, cy + hh * 0.85, cx, cy + hh, cx, cy + hh)
     .bezierCurveTo(cx - hw, cy + hh * 0.85, cx - hw, cy + bh, cx - hw, cy + bh)
     .lineTo(cx - hw, cy - hh * 0.4)
     .closePath().stroke();
  doc.restore();
}

/** Shield with checkmark inside */
function drawShieldCheck(doc, cx, cy, sz, color) {
  drawShield(doc, cx, cy, sz, color);
  doc.save().lineWidth(1.3).strokeColor(color).lineCap("round");
  const ts = sz * 0.42;
  doc.moveTo(cx - ts, cy + ts * 0.1)
     .lineTo(cx - ts * 0.2, cy + ts * 0.8)
     .lineTo(cx + ts, cy - ts * 0.5)
     .stroke();
  doc.restore();
}

/** Circle with two circular arrows (exchange icon) */
function drawExchange(doc, cx, cy, sz, color) {
  doc.save().lineWidth(1.4).strokeColor(color);
  doc.circle(cx, cy, sz * 0.85).stroke();
  // Top-right arrowhead
  doc.lineWidth(1.3).lineCap("round");
  const ax = cx + sz * 0.55, ay = cy - sz * 0.7;
  doc.moveTo(ax - 4, ay - 4).lineTo(ax + 2, ay + 2).stroke();
  doc.moveTo(ax + 2, ay + 2).lineTo(ax + 6, ay - 4).stroke();
  // Bottom-left arrowhead
  const bx = cx - sz * 0.55, by = cy + sz * 0.7;
  doc.moveTo(bx + 4, by + 4).lineTo(bx - 2, by - 2).stroke();
  doc.moveTo(bx - 2, by - 2).lineTo(bx - 6, by + 4).stroke();
  doc.restore();
}

/** Shield with star inside */
function drawShieldStar(doc, cx, cy, sz, color) {
  drawShield(doc, cx, cy, sz, color);
  doc.save().lineWidth(1.2).strokeColor(color).lineCap("round");
  // 5-point star
  const r1 = sz * 0.45, r2 = sz * 0.2;
  const oy = cy + sz * 0.05;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? r1 : r2;
    pts.push([cx + Math.cos(a) * r, oy + Math.sin(a) * r]);
  }
  doc.moveTo(pts[0][0], pts[0][1]);
  pts.slice(1).forEach(p => doc.lineTo(p[0], p[1]));
  doc.closePath().stroke();
  doc.restore();
}

// ══════════════════════════════════════════════════════════════════════════════
//  PDF BUILDER  — Matches reference image exactly
// ══════════════════════════════════════════════════════════════════════════════
function createPdfBuffer(model) {
  return new Promise((resolve, reject) => {
    const PW = 595.28;
    const PH = 841.89;
    const M  = 42;           // left/right margin
    const RX = PW - M;      // 553.28 — right edge of content
    const IW = RX - M;      // 511.28 — inner width

    const doc = new PDFDocument({ size: "A4", margin: 0, info: { Title: model.invoiceNumber } });
    registerFonts(doc);

    const chunks = [];
    doc.on("data", c => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Black page ────────────────────────────────────────────────────────────
    doc.rect(0, 0, PW, PH).fill(BLACK);

    // ── Gold corner L-brackets ────────────────────────────────────────────────
    const CL = 18, CO = 14;
    doc.save().lineWidth(1.1).strokeColor(GOLD).opacity(0.9);
    doc.moveTo(CO, CO + CL).lineTo(CO, CO).lineTo(CO + CL, CO).stroke();
    doc.moveTo(PW - CO - CL, CO).lineTo(PW - CO, CO).lineTo(PW - CO, CO + CL).stroke();
    doc.moveTo(CO, PH - CO - CL).lineTo(CO, PH - CO).lineTo(CO + CL, PH - CO).stroke();
    doc.moveTo(PW - CO - CL, PH - CO).lineTo(PW - CO, PH - CO).lineTo(PW - CO, PH - CO - CL).stroke();
    doc.restore();

    let y = CO + 16;

    // ── Clothes hanger ────────────────────────────────────────────────────────
    drawHanger(doc, PW / 2, y, GOLD);
    y += 58;

    // ── FH ───────────────────────────────────────────────────────────────────
    doc.fillColor(GOLD).font(F_SERIF_B).fontSize(34);
    drawCentered(doc, "FH", y, { characterSpacing: 3 });
    y += 42;

    // ── FASHION HUB ───────────────────────────────────────────────────────────
    doc.fillColor(WHITE).font(F_SERIF_B).fontSize(22);
    drawCentered(doc, "FASHION HUB", y, { characterSpacing: 4 });
    y += 28;

    // ── MEN'S PREMIUM FASHION + flanking rules ────────────────────────────────
    const tagY = y + 5;
    doc.save().lineWidth(0.5).strokeColor(GOLD).opacity(0.5)
       .moveTo(M + 10, tagY).lineTo(PW / 2 - 96, tagY).stroke()
       .moveTo(PW / 2 + 96, tagY).lineTo(RX - 10, tagY).stroke()
       .restore();
    doc.fillColor(GOLD).font(F).fontSize(8.5);
    drawCentered(doc, "MEN'S PREMIUM FASHION", y, { characterSpacing: 2.5 });
    y += 20;

    // thin gold separator line
    doc.save().lineWidth(0.4).strokeColor(GOLD).opacity(0.3)
       .moveTo(M + 30, y).lineTo(RX - 30, y).stroke().restore();
    y += 10;

    // ── Store info ────────────────────────────────────────────────────────────
    doc.fillColor(LGREY).font(F).fontSize(8.5);
    drawCentered(doc, model.storeAddress, y);
    y += 13;
    if (model.prefs.showStoreContact) {
      doc.fillColor(LGREY).font(F).fontSize(8.5);
      drawCentered(doc, `${model.storePhone}   |   ${model.storeContact2}`, y);
      y += 13;
    }
    if (model.prefs.showGstin) {
      doc.fillColor(MUTED).font(F).fontSize(8);
      drawCentered(doc, `GSTIN: ${model.gstin}`, y, { characterSpacing: 0.5 });
      y += 22;
    } else {
      y += 9;
    }

    // ── INVOICE title ─────────────────────────────────────────────────────────
    doc.font(FB).fontSize(16);
    doc.fillColor(GOLD);
    drawCentered(doc, "*   INVOICE   *", y, { characterSpacing: 4 });
    y += 30;

    // ── Meta card ─────────────────────────────────────────────────────────────
    const CARD_H = 72;
    // Card background + border
    doc.fillColor(DARK).rect(M, y, IW, CARD_H).fill();
    doc.save().lineWidth(0.5).strokeColor("#2E2E2E")
       .rect(M, y, IW, CARD_H).stroke().restore();

    // Vertical divider at midpoint
    const MID = M + IW / 2;
    doc.save().lineWidth(0.5).strokeColor("#333333")
       .moveTo(MID, y + 8).lineTo(MID, y + CARD_H - 8).stroke().restore();

    const lx = M + 14;
    const rx = MID + 14;
    const ly1 = y + 10, lv1 = y + 19;
    const ly2 = y + 39, lv2 = y + 48;

    // LEFT: Invoice No
    doc.fillColor(GOLD).font(FB).fontSize(8).text("Invoice No.", lx, ly1, { characterSpacing: 0.3 });
    doc.fillColor(WHITE).font(FB).fontSize(9).text(model.invoiceNumber, lx, lv1);
    // LEFT: Date + Time side by side
    doc.fillColor(GOLD).font(FB).fontSize(8).text("Date", lx, ly2, { characterSpacing: 0.3 });
    doc.fillColor(WHITE).font(F).fontSize(8.5).text(model.date, lx, lv2);
    doc.fillColor(GOLD).font(FB).fontSize(8).text("Time", lx + 88, ly2, { characterSpacing: 0.3 });
    doc.fillColor(WHITE).font(F).fontSize(8.5).text(model.time, lx + 88, lv2);

    // RIGHT: Customer / Mobile
    if (model.prefs.showCustomerDetails && model.customer?.name) {
      doc.fillColor(GOLD).font(FB).fontSize(8).text("Customer", rx, ly1, { characterSpacing: 0.3 });
      doc.fillColor(WHITE).font(FB).fontSize(10).text(model.customer.name, rx, lv1 - 1);
      if (model.customer.mobile) {
        doc.fillColor(GOLD).font(FB).fontSize(8).text("Mobile", rx, ly2, { characterSpacing: 0.3 });
        doc.fillColor(WHITE).font(F).fontSize(8.5).text(model.customer.mobile, rx, lv2);
      }
    } else {
      doc.fillColor(MUTED).font(F).fontSize(9).text("Walk-in Customer", rx, y + 30);
    }
    y += CARD_H + 10;

    // ── Items table ───────────────────────────────────────────────────────────
    // Columns: ITEM | QTY | RATE | AMOUNT  (all fit within M … RX)
    const CI = { x: M,             w: IW * 0.46 };
    const CQ = { x: M + IW * 0.46, w: IW * 0.12 };
    const CR = { x: M + IW * 0.58, w: IW * 0.21 };
    const CA = { x: M + IW * 0.79, w: IW * 0.21 }; // ends at M + IW = RX ✓

    // Header row (black background)
    doc.fillColor(BLACK).rect(M, y, IW, 22).fill();
    doc.fillColor(WHITE).font(FB).fontSize(7.5);
    doc.text("ITEM",   CI.x + 6, y + 7, { width: CI.w, align: "left"   });
    doc.text("QTY",    CQ.x,     y + 7, { width: CQ.w, align: "center" });
    doc.text("RATE",   CR.x,     y + 7, { width: CR.w, align: "right"  });
    doc.text("AMOUNT", CA.x,     y + 7, { width: CA.w, align: "right"  });
    y += 22;

    // Item rows
    for (let i = 0; i < model.rows.length; i++) {
      const row  = model.rows[i];
      const rowH = (model.prefs.showVariantInfo && row.variant) ? 30 : 22;

      doc.fillColor(WHITE).font(FB).fontSize(9)
         .text(row.description, CI.x + 6, y + 6, { width: CI.w - 6 });
      if (model.prefs.showVariantInfo && row.variant) {
        doc.fillColor(MUTED).font(F).fontSize(8)
           .text(`(${row.variant})`, CI.x + 6, y + 17, { width: CI.w - 6 });
      }

      doc.fillColor(WHITE).font(F).fontSize(9);
      doc.text(String(row.quantity), CQ.x, y + 6, { width: CQ.w, align: "center" });
      doc.text(row.rate,             CR.x, y + 6, { width: CR.w, align: "right"  });
      doc.fillColor(WHITE).font(FB).fontSize(9)
         .text(row.total,            CA.x, y + 6, { width: CA.w, align: "right"  });

      y += rowH;

      if (i < model.rows.length - 1) {
        doc.save().lineWidth(0.3).strokeColor("#2A2A2A")
           .moveTo(M, y).lineTo(RX, y).stroke().restore();
      }
    }

    y += 6;

    // ── Totals (right-aligned block) ───────────────────────────────────────────
    doc.save().lineWidth(0.4).strokeColor("#333")
       .moveTo(M, y).lineTo(RX, y).stroke().restore();
    y += 8;

    const TLX = M + IW * 0.35;
    const TRW = IW * 0.65;

    function trow(label, val, vc = "#AAAAAA") {
      doc.fillColor("#AAAAAA").font(F).fontSize(8.5)
         .text(label, TLX, y, { width: TRW * 0.5 });
      doc.fillColor(vc).font(F).fontSize(8.5)
         .text(val, TLX, y, { width: TRW, align: "right" });
      y += 15;
    }

    trow("Subtotal", model.subtotal);
    if (model.discountPaisa > 0) trow("Discount", `- ${model.discount}`, GOLD);
    // Taxes removed per user request
    y += 4;

    // ── Gold TOTAL bar ────────────────────────────────────────────────────────
    doc.fillColor(GOLD).rect(M, y, IW, 32).fill();
    doc.fillColor(BLACK).font(FB).fontSize(14)
       .text("TOTAL", M + 14, y + 9, { width: IW * 0.44 });
    doc.fillColor(BLACK).font(FB).fontSize(17)
       .text(model.total, M, y + 8, { width: IW, align: "right" });
    y += 42;

    // ── Payment row ───────────────────────────────────────────────────────────
    doc.save().lineWidth(0.3).strokeColor("#2E2E2E")
       .moveTo(M, y).lineTo(RX, y).stroke().restore();
    y += 8;

    // Left: Payment Method | method
    doc.fillColor(GOLD).font(FB).fontSize(8).text("Payment Method", M + 6, y, { characterSpacing: 0.2 });
    doc.fillColor("#444444").font(F).fontSize(10).text("|", M + 110, y - 1);
    doc.fillColor(WHITE).font(F).fontSize(9).text(model.paymentMethods || "UPI", M + 120, y);

    // Right: Amount Paid | amount
    const pmid = M + IW * 0.5 + 6;
    doc.fillColor(GOLD).font(FB).fontSize(8).text("Amount Paid", pmid, y, { characterSpacing: 0.2 });
    doc.fillColor("#444444").font(F).fontSize(10).text("|", pmid + 80, y - 1);
    doc.fillColor(WHITE).font(FB).fontSize(9).text(model.total, pmid + 90, y);
    y += 26;

    // ── Trust features ─────────────────────────────────────────────────────────
    if (model.prefs.showTrustBadges) {
      doc.save().lineWidth(0.3).strokeColor("#2E2E2E")
         .moveTo(M, y).lineTo(RX, y).stroke().restore();
      y += 18;

      const ICON_SZ = 9;     // icon "radius" / scale
      const c3 = IW / 3;

      // Feature 1 — Shield + Checkmark
      const cx1 = M + c3 * 0 + c3 / 2;
      drawShieldCheck(doc, cx1, y + ICON_SZ, ICON_SZ, GOLD);
      doc.fillColor(WHITE).font(FB).fontSize(7)
         .text("100% Original", cx1 - 34, y + ICON_SZ * 2 + 7, { width: 68, align: "center" });
      doc.fillColor(MUTED).font(F).fontSize(6.5)
         .text("Products", cx1 - 34, y + ICON_SZ * 2 + 17, { width: 68, align: "center" });

      // Feature 2 — Exchange Arrows
      const cx2 = M + c3 * 1 + c3 / 2;
      drawExchange(doc, cx2, y + ICON_SZ, ICON_SZ, GOLD);
      doc.fillColor(WHITE).font(FB).fontSize(7)
         .text("Easy Exchange", cx2 - 38, y + ICON_SZ * 2 + 7, { width: 76, align: "center" });
      doc.fillColor(MUTED).font(F).fontSize(6.5)
         .text("Within 7 Days", cx2 - 38, y + ICON_SZ * 2 + 17, { width: 76, align: "center" });

      // Feature 3 — Shield + Star
      const cx3 = M + c3 * 2 + c3 / 2;
      drawShieldStar(doc, cx3, y + ICON_SZ, ICON_SZ, GOLD);
      doc.fillColor(WHITE).font(FB).fontSize(7)
         .text("Premium Quality", cx3 - 40, y + ICON_SZ * 2 + 7, { width: 80, align: "center" });
      doc.fillColor(MUTED).font(F).fontSize(6.5)
         .text("Assured", cx3 - 40, y + ICON_SZ * 2 + 17, { width: 80, align: "center" });

      y += ICON_SZ * 2 + 36;
    } else {
      y += 24;
    }

    // ── Policy Footnote ───────────────────────────────────────────────────────
    if (model.prefs.showPolicyText) {
      y += 10;
      doc.fillColor(MUTED).font(F).fontSize(8)
         .text("Please retain this invoice for exchange/return purposes.", 0, y, { width: PW, align: "center" });
      y += 11;
      doc.text("Exchange available within 7 days, subject to applicable store policy.", 0, y, { width: PW, align: "center" });
      y += 24;
    }

    // ── Footer ─────────────────────────────────────────────────────────────────
    doc.save().lineWidth(0.4).strokeColor(GOLD).opacity(0.3)
       .moveTo(M + 20, y).lineTo(RX - 20, y).stroke().restore();
    y += 16;

    // "Thank you" in italic gold (no tracking, so align: center works fine)
    doc.fillColor(GOLD).font(F_SERIF_I).fontSize(12)
       .text("Thank you for shopping with us!", 0, y, { width: PW, align: "center" });
    y += 22;

    // "STYLE THAT DEFINES YOU" in white bold spaced
    doc.fillColor(WHITE).font(FB).fontSize(9);
    drawCentered(doc, "STYLE THAT DEFINES YOU", y, { characterSpacing: 3 });

    doc.end();
  });
}

// ─── Model builder ──────────────────────────────────────────────────────────
function buildModel(snapshot, prefs = {}) {
  const issuedAt = new Date(snapshot.issuedAt);
  const date = issuedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const time = issuedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();

  const taxPaisa = snapshot.taxPaisa || 0;
  const halfTax  = Math.round(taxPaisa / 2);
  const taxRate  = snapshot.items?.[0]?.taxRate || 5;

  const store = snapshot.store || {};

  return {
    invoiceNumber:  snapshot.invoiceNumber,
    date,
    time,
    customer:       snapshot.customer,
    storeAddress:   store.address   || `Main Road Mairwa, Near Nahar Bridge, ${STORE.pincode}`,
    storePhone:     store.phone     || STORE.phone,
    storeContact2:  store.instagram || STORE.instagram,
    gstin:          store.gstin     || STORE.gstin,
    rows: (snapshot.items || []).map(item => ({
      description: item.productName || "",
      variant:     [item.color, item.size].filter(Boolean).join(" / "),
      quantity:    item.quantity,
      rate:        fmt(item.unitPricePaisa),
      total:       fmt(item.totalPaisa ?? item.unitPricePaisa * item.quantity),
    })),
    subtotal:       fmt(snapshot.subtotalPaisa),
    discount:       fmt(snapshot.discountPaisa),
    discountPaisa:  snapshot.discountPaisa || 0,
    taxPaisa:       taxPaisa,
    cgst:           fmt(halfTax),
    cgstPaisa:      halfTax,
    cgstRate:       taxRate / 2,
    sgst:           fmt(halfTax),
    sgstPaisa:      halfTax,
    sgstRate:       taxRate / 2,
    total:          fmt(snapshot.totalPaisa),
    paymentMethods: (snapshot.payments || []).map(p => p.method).join(" + "),
    prefs: {
      showStoreContact: prefs.showStoreContact !== false,
      showGstin: prefs.showGstin !== false,
      showCustomerDetails: prefs.showCustomerDetails !== false,
      showTaxBreakdown: prefs.showTaxBreakdown !== false,
      showVariantInfo: prefs.showVariantInfo !== false,
      showTrustBadges: prefs.showTrustBadges !== false,
      showPolicyText: prefs.showPolicyText !== false,
    }
  };
}


// ─── Public API ─────────────────────────────────────────────────────────────
export async function generateInvoicePdf(invoiceId) {
  await connectToDatabase();
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  const settings = await Settings.findOne().lean();

  const model    = buildModel(invoice.snapshot, settings?.invoicePreferences || {});
  const fileName = `${safeFileName(invoice.invoiceNumber)}.pdf`;
  const filePath = path.join(INVOICE_DIR, fileName);
  const relPath  = path.posix.join("storage/invoices", fileName);

  try {
    await fs.mkdir(INVOICE_DIR, { recursive: true });
    const buffer = await createPdfBuffer(model);
    await fs.writeFile(filePath, buffer);
    await Invoice.updateOne({ _id: invoice._id }, {
      $set: { pdfStatus: "READY", pdfPath: relPath, pdfGeneratedAt: new Date(), pdfError: undefined },
    });
    return { invoice, buffer, relPath };
  } catch (err) {
    await Invoice.updateOne({ _id: invoice._id }, { $set: { pdfStatus: "FAILED", pdfError: err.message } });
    throw err;
  }
}

export async function readInvoicePdf(invoiceId) {
  await connectToDatabase();
  let invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  await generateInvoicePdf(invoiceId);
  invoice = await Invoice.findById(invoiceId);
  return fs.readFile(path.join(INVOICE_DIR, path.basename(invoice.pdfPath)));
}
