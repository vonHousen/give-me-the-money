/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RECEIPT_SCAN_API_URL?: string
  /** API base URL (no trailing slash). POST settlement to `{base}/settlements`. Empty → mock. */
  readonly VITE_SETTLEMENT_API_URL?: string
  /** Public origin for QR deep links (no trailing slash), e.g. https://gmtm.app */
  readonly VITE_PUBLIC_APP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
