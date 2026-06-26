/**
 * Turn an uploaded photo into something the OCR engine can reliably read:
 *  1. Decode it. The browser's native decoder handles JPG/PNG everywhere and HEIC
 *     on macOS/Safari — no library needed.
 *  2. If native decode fails (e.g. HEIC in Chrome), fall back to heic2any.
 *  3. Downscale to a sane size. Phone photos are often 12–24 MP, which blows past
 *     canvas limits and exhausts memory during OCR; shrinking fixes both and speeds
 *     recognition up dramatically. Text stays perfectly legible at this size.
 */
const MAX_DIM = 2200

async function decode(blob: Blob): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(blob)
  } catch {
    return null
  }
}

function bitmapToScaledJpeg(bitmap: ImageBitmap, maxDim = MAX_DIM): Promise<Blob> {
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas not available')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('image encode failed'))),
      'image/jpeg',
      0.92,
    ),
  )
}

export async function toReadableImage(file: File): Promise<Blob> {
  // 1. Try the browser's built-in decoder first (handles HEIC on macOS/Safari).
  let bitmap = await decode(file)

  // 2. Fall back to converting HEIC/HEIF explicitly (e.g. Chrome can't decode it).
  if (!bitmap) {
    const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
    if (isHeic) {
      try {
        const heic2any = (await import('heic2any')).default
        const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
        const jpeg = Array.isArray(out) ? out[0] : out
        bitmap = await decode(jpeg)
        if (!bitmap) return jpeg // hand the converted JPEG to OCR as a last resort
      } catch (e) {
        throw new Error(
          `couldn't convert this HEIC photo${e instanceof Error ? ` (${e.message})` : ''}`,
        )
      }
    } else {
      return file // unknown format — let OCR attempt it directly
    }
  }

  // 3. Downscale for fast, memory-safe OCR.
  return bitmapToScaledJpeg(bitmap)
}
