const CURRENCY_SYMBOL = "Rs";

type Numeric = number | string | { toString(): string };

export function formatMoney(value: Numeric): string {
  const num = Number(value);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));
  return `${num < 0 ? "-" : ""}${CURRENCY_SYMBOL} ${formatted}`;
}

export function formatQty(value: Numeric): string {
  const num = Number(value);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}
