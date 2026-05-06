import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number, mode: 'rent' | 'sale' = 'sale') {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(amount) + (mode === 'rent' ? ' / mån' : '')
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('sv-SE').format(value)
}
