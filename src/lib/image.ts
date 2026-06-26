/**
 * Image prep for the photo importer.
 *  - Decodes with the browser's native engine (handles JPG/PNG everywhere and HEIC
 *    on macOS/Safari), falling back to heic2any for HEIC where the browser can't.
 *  - Produces a larger image for OCR and a smaller compressed JPEG data URL to store
 *    on the recipe. Phone photos are 12–24 MP, which blows past canvas limits and
 *    exhausts memory; downscaling fixes both and keeps stored recipes small.
 */
const OCR_MAX = 2200 // px, long edge — good OCR accuracy without memory issues
const STORE_MAX = 1100 // px, long edge — crisp enough to read back, small to store

async function decode(blob: Blob): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(blob)
  } catch {
    return null
  }
}

async function toBitmap(file: File): Promise<ImageBitmap> {
  const native = await decode(file)
  if (native) return native

  const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
  if (isHeic) {
    const heic2any = (await import('heic2any')).default
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
    const jpeg = Array.isArray(out) ? out[0] : out
    const fromJpeg = await decode(jpeg)
    if (fromJpeg) return fromJpeg
  }
  throw new Error('this image could not be opened')
}

function scaledCanvas(bitmap: ImageBitmap, maxDim: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas not available')
  ctx.drawImage(bitmap, 0, 0, w, h)
  return canvas
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('image encode failed'))),
      'image/jpeg',
      quality,
    ),
  )
}

export interface PreparedPhoto {
  /** Downscaled image to feed the OCR engine. */
  ocrBlob: Blob
  /** Compressed JPEG data URL to save on the recipe. */
  storedDataUrl: string
}

/** Decode once, then make both an OCR image and a storable photo from the same frame. */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const bitmap = await toBitmap(file)
  try {
    const ocrBlob = await canvasToBlob(scaledCanvas(bitmap, OCR_MAX), 0.9)
    const storedDataUrl = scaledCanvas(bitmap, STORE_MAX).toDataURL('image/jpeg', 0.7)
    return { ocrBlob, storedDataUrl }
  } finally {
    bitmap.close?.()
  }
}

/** Storage-only: a downscaled JPEG data URL, for attaching a photo without OCR. */
export async function fileToStoredPhoto(file: File): Promise<string> {
  const bitmap = await toBitmap(file)
  try {
    return scaledCanvas(bitmap, STORE_MAX).toDataURL('image/jpeg', 0.7)
  } finally {
    bitmap.close?.()
  }
}
