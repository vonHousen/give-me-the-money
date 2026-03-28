/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base URL (no trailing slash). POST to `{base}/analyze`. Empty -> mock. */
  readonly VITE_RECEIPT_SCAN_API_URL?: string
  /** API base URL (no trailing slash). Endpoints appended by code. Empty -> mock. */
  readonly VITE_SETTLEMENT_API_URL?: string
  /** Public origin for QR deep links (no trailing slash), e.g. https://gmtm.app */
  readonly VITE_PUBLIC_APP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/* BarcodeDetector — Shape Detection API (Chrome 83+, Safari 17.2+) */
interface BarcodeDetectorOptions {
  formats?: string[]
}
interface DetectedBarcode {
  rawValue: string
  format: string
  boundingBox: DOMRectReadOnly
  cornerPoints: Array<{ x: number; y: number }>
}
declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions)
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>
  static getSupportedFormats(): Promise<string[]>
}
