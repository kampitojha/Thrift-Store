/** Money helpers — always store as integer paise */

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatMoney(
  paise: number,
  options: { currency?: string; locale?: string; showSymbol?: boolean } = {},
): string {
  const { currency = 'INR', locale = 'en-IN', showSymbol = true } = options;
  const amount = paiseToRupees(paise);

  if (!showSymbol) {
    return amount.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function calcDiscountPct(
  pricePaise: number,
  originalPaise: number | null | undefined,
): number {
  if (!originalPaise || originalPaise <= pricePaise) return 0;
  return Math.round(((originalPaise - pricePaise) / originalPaise) * 100);
}

export function calcCommission(amountPaise: number, bps: number): number {
  return Math.floor((amountPaise * bps) / 10_000);
}

export function calcSellerEarning(amountPaise: number, bps: number): number {
  return amountPaise - calcCommission(amountPaise, bps);
}
