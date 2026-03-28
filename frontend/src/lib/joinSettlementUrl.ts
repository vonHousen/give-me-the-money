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

/**
 * Parses a settlement id from manual entry, a pasted join URL, or QR text.
 * URLs may use any origin (e.g. production or localhost); path must contain `/split/:id`.
 */
export function parseSettlementIdFromJoinPayload(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null

  if (/^[a-zA-Z0-9_-]+$/.test(t)) {
    return t
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
    return decodeURIComponent(m[1])
  } catch {
    return null
  }
}
