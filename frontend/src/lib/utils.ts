import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Round to 2 decimal places for currency line totals. */
export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
