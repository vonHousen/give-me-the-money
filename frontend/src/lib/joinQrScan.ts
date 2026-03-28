import jsQR from 'jsqr'

function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image()
  img.decoding = 'async'
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = src
  })
}

/**
 * Try the native BarcodeDetector API (Chrome 83+, Safari 17.2+).
 * Much more robust with real-world camera photos than jsQR.
 */
async function detectWithBarcodeApi(blob: Blob): Promise<string | null> {
  if (typeof globalThis.BarcodeDetector === 'undefined') return null
  try {
    const bitmap = await createImageBitmap(blob)
    const detector = new BarcodeDetector({ formats: ['qr_code'] })
    const results = await detector.detect(bitmap)
    bitmap.close()
    return results[0]?.rawValue ?? null
  } catch {
    return null
  }
}

const MAX_JSQR_DIMENSION = 1200

/**
 * Decode QR with jsQR, downscaling large images for better detection.
 */
function decodeWithJsQR(img: HTMLImageElement): string | null {
  const { naturalWidth: w, naturalHeight: h } = img
  const scale = Math.max(w, h) > MAX_JSQR_DIMENSION ? MAX_JSQR_DIMENSION / Math.max(w, h) : 1
  const cw = Math.round(w * scale)
  const ch = Math.round(h * scale)

  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, cw, ch)
  const imageData = ctx.getImageData(0, 0, cw, ch)
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  })
  return result?.data ?? null
}

/**
 * Decodes the first QR code in an image file (camera photo or gallery pick).
 * Uses native BarcodeDetector when available, falls back to jsQR with downscaling.
 */
export async function decodeQrFromImageFile(file: File): Promise<string | null> {
  const nativeResult = await detectWithBarcodeApi(file)
  if (nativeResult) return nativeResult

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImage(objectUrl)
    return decodeWithJsQR(img)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
