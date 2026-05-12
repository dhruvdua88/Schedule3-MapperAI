// ============ OCR FALLBACK FOR SCANNED PDFs ============
//
// When pdfExtract.js detects a scanned (image-based) PDF — text-items per
// page below the SCANNED_THRESHOLD — the regular extractor yields garbage.
// This module renders each page to a canvas via pdf.js, hands the image to
// Tesseract.js (loaded lazily from CDN to keep the main bundle lean), and
// returns markdown text in the same shape as pdfExtract.
//
// Expected cost: ~3-8s per page (varies by image size and CPU).
// Total bundle impact: 0 — Tesseract is only downloaded if OCR is triggered.

import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc;

const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

// ── Lazy-load Tesseract.js from CDN ──
let _tesseractPromise = null;
function loadTesseract() {
  if (typeof window !== 'undefined' && window.Tesseract) return Promise.resolve(window.Tesseract);
  if (_tesseractPromise) return _tesseractPromise;
  _tesseractPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-tesseract]');
    if (existing) {
      existing.addEventListener('load', () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error('Tesseract load incomplete')));
      existing.addEventListener('error', () => reject(new Error('Tesseract script failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = TESSERACT_CDN;
    script.async = true;
    script.dataset.tesseract = 'true';
    let done = false;
    script.onload  = () => { if (!done) { done = true; window.Tesseract ? resolve(window.Tesseract) : reject(new Error('Tesseract not on window')); } };
    script.onerror = () => { if (!done) { done = true; reject(new Error('Failed to load Tesseract.js from jsdelivr CDN')); } };
    setTimeout(() => { if (!done) { done = true; reject(new Error('Tesseract CDN load timeout (20s)')); } }, 20_000);
    document.head.appendChild(script);
  });
  return _tesseractPromise;
}

/**
 * OCR a PDF end-to-end and return markdown + per-page text.
 *
 * @param {ArrayBuffer} arrayBuffer - raw PDF bytes
 * @param {object}      [opts]
 * @param {function}    [opts.onProgress] - ({phase, current, total, status}) callback
 * @param {AbortSignal} [opts.signal]     - cancellation
 * @param {string}      [opts.language]   - Tesseract language code (default: 'eng')
 * @returns {Promise<{markdown, pageCount, charCount, looksScanned, pages}>}
 */
export async function ocrPdfToMarkdown(arrayBuffer, { onProgress, signal, language = 'eng' } = {}) {
  // 1. Load pdf and Tesseract in parallel.
  const [pdf, Tesseract] = await Promise.all([
    pdfjsLib.getDocument({ data: arrayBuffer }).promise,
    loadTesseract(),
  ]);
  const pageCount = pdf.numPages;

  // 2. Create a worker. createWorker accepts an opts object in newer Tesseract.
  onProgress?.({ phase: 'ocr-init', current: 0, total: pageCount, status: 'Initialising OCR engine…' });
  const worker = await Tesseract.createWorker(language, 1, {
    logger: (m) => {
      // m: { status, progress, jobId }
      // Progress fires per page during recognize() — we map it through.
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress?.({ phase: 'ocr-page', status: m.status, progress: m.progress });
      }
    },
  });

  try {
    let markdown = '';
    const pages = [];

    for (let i = 1; i <= pageCount; i++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      onProgress?.({ phase: 'ocr-page', current: i, total: pageCount, status: `Rendering page ${i}…` });

      // 3. Render page to a canvas at 2x scale for OCR clarity.
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width  = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;

      onProgress?.({ phase: 'ocr-page', current: i, total: pageCount, status: `Reading text from page ${i}…` });
      // 4. OCR the canvas. Pass the canvas element directly — Tesseract handles it.
      const { data } = await worker.recognize(canvas);
      const pageText = (data?.text || '').trim();

      markdown += `\n---\n## Page ${i}\n\n${pageText || '*[OCR returned no text]*'}\n`;
      pages.push({ pageNum: i, text: pageText });

      // 5. Free the canvas memory aggressively.
      canvas.width = 0; canvas.height = 0;
    }

    const finalMarkdown = markdown.trim();
    return {
      markdown:    finalMarkdown,
      pageCount,
      charCount:   finalMarkdown.length,
      looksScanned: false,  // we just OCR'd it; downstream UI should treat as text
      pages,
    };
  } finally {
    try { await worker.terminate(); } catch { /* ignore */ }
  }
}
