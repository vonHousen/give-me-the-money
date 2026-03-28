const DATA_URL_RE = /^data:([^;]+);base64,(.+)$/s

/** Parse a `data:*;base64,*` URL into API payload fields (raw base64, no prefix). */
export function dataUrlToPayload(dataUrl: string): { image_base64: string; mime_type: string } {
  const m = dataUrl.match(DATA_URL_RE)
  if (!m?.[1] || !m[2]) {
    throw new Error('Invalid data URL: expected data:*;base64,*')
  }
  return { mime_type: m[1], image_base64: m[2] }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('FileReader did not return a string'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
    reader.readAsDataURL(blob)
  })
}

export async function blobToBase64Payload(
  blob: Blob,
): Promise<{ image_base64: string; mime_type: string }> {
  const dataUrl = await blobToDataUrl(blob)
  return dataUrlToPayload(dataUrl)
}
