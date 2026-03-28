import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { blobToBase64Payload, dataUrlToPayload } from './receiptScanEncoding'

describe('dataUrlToPayload', () => {
  it('strips data URL prefix and returns mime + raw base64', () => {
    const payload = dataUrlToPayload('data:image/png;base64,QUJD')
    expect(payload.mime_type).toBe('image/png')
    expect(payload.image_base64).toBe('QUJD')
  })

  it('throws on invalid input', () => {
    expect(() => dataUrlToPayload('not-a-data-url')).toThrow(/Invalid data URL/)
  })
})

describe('blobToBase64Payload', () => {
  it('encodes a small image file to payload matching Buffer base64', async () => {
    const bytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const blob = new Blob([bytes], { type: 'image/png' })
    const { image_base64, mime_type } = await blobToBase64Payload(blob)
    expect(mime_type).toBe('image/png')
    expect(image_base64).toBe(Buffer.from(bytes).toString('base64'))
  })

  it('reads sample receipt.jpeg and produces non-empty base64', async () => {
    const thisDir = dirname(fileURLToPath(import.meta.url))
    const samplePath = join(thisDir, '../../../data/receipt.jpeg')
    if (!existsSync(samplePath)) {
      return
    }
    const buf = readFileSync(samplePath)
    const file = new File([buf], 'receipt.jpeg', { type: 'image/jpeg' })
    const { image_base64, mime_type } = await blobToBase64Payload(file)
    expect(mime_type).toBe('image/jpeg')
    expect(image_base64.length).toBeGreaterThan(100)
    expect(Buffer.from(image_base64, 'base64').length).toBe(buf.length)
  })
})
