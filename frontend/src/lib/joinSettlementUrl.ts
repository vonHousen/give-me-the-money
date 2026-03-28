/**
 * Public origin for deep links (QR, copy). No trailing slash.
 * Prefer `VITE_PUBLIC_APP_URL` in production; falls back to `window.location.origin` in the browser, then a stable default for tests/SSR.
 */
export function getPublicAppUrl(): string {
  const raw = import.meta.env.VITE_PUBLIC_APP_URL
  if (typeof raw === 'string' && raw.trim() !== '') {
    return raw.trim().replace(/\/$/, '')
  }
  if (typeof globalThis !== 'undefined' && 'location' in globalThis) {
    const loc = (globalThis as unknown as { location?: { origin?: string } }).location
    if (loc?.origin) return loc.origin.replace(/\/$/, '')
  }
  return 'https://gmtm.app'
}

/** Single join deep link for Share + Join pages and QR payloads. */
export function buildJoinSettlementUrl(settlementId: string): string {
  const base = getPublicAppUrl()
  return `${base}/split/${settlementId}`
}
