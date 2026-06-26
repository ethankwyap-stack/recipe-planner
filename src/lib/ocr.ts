export interface OcrProgress {
  status: string
  /** 0..1 */
  progress: number
}

/**
 * Read text out of a recipe photo entirely in the browser using Tesseract.js.
 * No server, no API key, no billing — the engine + English model load from a
 * free public CDN the first time and are then cached by the browser.
 *
 * Tesseract.js is imported dynamically so its ~weighty WASM only loads when the
 * user actually scans a photo, keeping the rest of the app fast.
 */
export async function recognizeImage(
  file: File | Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    logger: (m: { status: string; progress: number }) =>
      onProgress?.({ status: m.status, progress: m.progress ?? 0 }),
  })
  try {
    const { data } = await worker.recognize(file)
    return data.text
  } finally {
    await worker.terminate()
  }
}
