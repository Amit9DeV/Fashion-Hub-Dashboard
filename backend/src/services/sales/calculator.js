export function fiscalYearCode(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth(); // January is 0
  const starts = month >= 3 ? year : year - 1;
  return `${String(starts).slice(-2)}-${String(starts + 1).slice(-2)}`;
}

export function compactCart(items) {
  const grouped = new Map();
  for (const item of items) {
    const key = `${item.productId}:${item.variantId}`;
    const previous = grouped.get(key);
    grouped.set(key, {
      ...item,
      quantity: (previous?.quantity || 0) + item.quantity,
    });
  }
  return [...grouped.values()];
}

/**
 * Prices are held in integer paisa and are tax-inclusive. This avoids both
 * floating point money errors and ambiguous tax amounts at checkout.
 */
export function calculateSale(lines, requestedDiscountPaisa = 0) {
  const subtotalPaisa = lines.reduce((sum, line) => sum + line.unitPricePaisa * line.quantity, 0);
  if (requestedDiscountPaisa > subtotalPaisa) {
    throw new Error("Discount cannot be greater than the cart subtotal.");
  }

  let assignedDiscount = 0;
  let assignedTax = 0;
  const calculatedItems = lines.map((line, index) => {
    const grossPaisa = line.unitPricePaisa * line.quantity;
    const isLast = index === lines.length - 1;
    const discountPaisa = isLast
      ? requestedDiscountPaisa - assignedDiscount
      : Math.floor((requestedDiscountPaisa * grossPaisa) / subtotalPaisa);
    assignedDiscount += discountPaisa;

    const taxablePaisa = grossPaisa - discountPaisa;
    // Tax is part of a tax-inclusive selling price.
    const taxPaisa = Math.round((taxablePaisa * line.taxRate) / (100 + line.taxRate));
    assignedTax += taxPaisa;

    return {
      ...line,
      grossPaisa,
      discountPaisa,
      taxablePaisa,
      taxPaisa,
      totalPaisa: taxablePaisa,
      unitCostPaisa: line.unitCostPaisa || 0,
      totalItemCostPaisa: (line.unitCostPaisa || 0) * line.quantity,
    };
  });

  return {
    items: calculatedItems,
    subtotalPaisa,
    discountPaisa: requestedDiscountPaisa,
    taxPaisa: assignedTax,
    totalPaisa: subtotalPaisa - requestedDiscountPaisa,
  };
}
