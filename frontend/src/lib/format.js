export const CURRENCY_SYMBOL = {
  EUR: '€', USD: '$', GBP: '£', INR: '₹', SGD: 'S$', AED: 'AED',
  JPY: '¥', CHF: 'Fr', BRL: 'R$', AUD: 'A$', CNY: '¥',
}

export function sym(currency) {
  return CURRENCY_SYMBOL[currency] || currency || '€'
}

/** Format a numeric value with currency symbol + unit, respecting the chosen currency. */
export function fmtMoney(value, currency = 'EUR', unit = 'M') {
  if (value == null || value === '' || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  const display = n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : n.toLocaleString(undefined, { maximumFractionDigits: 1 })
  return `${sym(currency)}${display}${unit}`
}

export function fmtPct(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${Number(value).toFixed(1)}%`
}

export function fmtX(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${Number(value).toFixed(1)}x`
}
