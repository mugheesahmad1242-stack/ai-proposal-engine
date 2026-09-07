export function formatMoney(amount: unknown, currency = 'USD') {
  const value = typeof amount === 'number' ? amount : Number(amount);
  const code = /^[A-Z]{3}$/.test(currency.toUpperCase()) ? currency.toUpperCase() : 'USD';
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(value);
}
