/**
 * Make an uploaded image something the browser + OCR can actually read.
 * Browsers can't decode HEIC/HEIF (the default iPhone/Mac photo format), so those
 * are converted to JPEG in-browser (free, client-side). Everything else passes through.
 */
export async function toReadableImage(file: File): Promise<Blob> {
  const isHeic =
    /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
  if (!isHeic) return file

  // heic2any pulls in a WASM decoder, so load it only when actually needed.
  const heic2any = (await import('heic2any')).default
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
  return Array.isArray(out) ? out[0] : out
}
