import test from "node:test";
import assert from "node:assert/strict";
import { calculateSale, fiscalYearCode } from "../services/sales/calculator.js";

test("calculates tax-inclusive totals and distributes discount exactly", () => {
  const sale = calculateSale([
    { sku: "A", unitPricePaisa: 149900, quantity: 1, taxRate: 5 },
    { sku: "B", unitPricePaisa: 249900, quantity: 1, taxRate: 12 },
  ], 20000);

  assert.equal(sale.subtotalPaisa, 399800);
  assert.equal(sale.discountPaisa, 20000);
  assert.equal(sale.totalPaisa, 379800);
  assert.equal(sale.items[0].discountPaisa + sale.items[1].discountPaisa, 20000);
  assert.ok(sale.taxPaisa > 0);
});

test("uses the Indian April-to-March financial year for invoice numbering", () => {
  assert.equal(fiscalYearCode(new Date("2026-03-31T12:00:00Z")), "25-26");
  assert.equal(fiscalYearCode(new Date("2026-04-01T12:00:00Z")), "26-27");
});
