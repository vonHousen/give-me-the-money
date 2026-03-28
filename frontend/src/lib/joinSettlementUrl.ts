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

/** Single join deep link for Share + Join pages and QR payloads. Includes currency when non-USD. */
export function buildJoinSettlementUrl(settlementId: string, currencyCode?: string): string {
  const base = getPublicAppUrl()
  const url = `${base}/split/${settlementId}`
  if (currencyCode && currencyCode.toUpperCase() !== 'USD') {
    return `${url}?c=${encodeURIComponent(currencyCode.toUpperCase())}`
  }
  return url
}

export type JoinPayload = {
  settlementId: string
  /** ISO 4217 currency code embedded in the URL, if present. */
  currencyCode?: string
}

/**
 * Parses a settlement id (and optional currency) from manual entry, a pasted join URL, or QR text.
 * URLs may use any origin (e.g. production or localhost); path must contain `/split/:id`.
 */
export function parseSettlementIdFromJoinPayload(raw: string): string | null {
  return parseJoinPayload(raw)?.settlementId ?? null
}

export function parseJoinPayload(raw: string): JoinPayload | null {
  const t = raw.trim()
  if (!t) return null

  if (/^[a-zA-Z0-9_-]+$/.test(t)) {
    return { settlementId: t }
  }

  let url: URL
  try {
    url = new URL(t)
  } catch {
    try {
      url = new URL(t, 'https://placeholder.invalid')
    } catch {
      return null
    }
  }

  const m = url.pathname.match(/\/split\/([^/?#]+)/)
  if (!m) return null
  try {
    const settlementId = decodeURIComponent(m[1])
    const c = url.searchParams.get('c')
    return {
      settlementId,
      currencyCode: c && /^[A-Z]{3}$/i.test(c) ? c.toUpperCase() : undefined,
    }
  } catch {
    return null
  }
}
