// ============ PDF → MARKDOWN EXTRACTOR ============
//
// Uses pdfjs-dist (Mozilla PDF.js) to extract text client-side.
// PDF binary never leaves the browser — only the extracted markdown is sent to DeepSeek.
//
// Strategy:
//   1. Load PDF via pdfjsLib.getDocument({ data: arrayBuffer })
//   2. Per page: call page.getTextContent() to get items with position metadata
//   3. Cluster items by Y coordinate (within 3 px tolerance) to form rows
//   4. Within each row, sort by X coordinate for reading order
//   5. Detect table rows: 3+ items with significant horizontal gaps (> 30 px)
//   6. Detect headings: items with font size > 1.3× page median
//   7. Detect section breaks: vertical gap > 20 px between rows
//   8. Output a single markdown doc with page separators
//
// Quality note: works well for Tally-generated and Excel-to-PDF files (~90% accuracy).
// Scanned PDFs (very few text items per page) will produce poor output;
// a warning is surfaced in the UI in that case.

import * as pdfjsLib from 'pdfjs-dist';

// Vite ?url suffix gives us the absolute URL of the bundled worker file.
// This avoids CDN dependencies and CORS issues.
import pdfjsWorkerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc;

// Heuristic: if avg text items per page < this threshold, PDF is likely scanned
const SCANNED_THRESHOLD = 5;

/**
 * Extract PDF to markdown.
 *
 * @param {ArrayBuffer} arrayBuffer   - Raw PDF bytes
 * @param {object}      [opts]
 * @param {function}    [opts.onProgress]  - ({phase, current, total}) progress callback
 * @returns {Promise<{markdown, pageCount, charCount, looksScanned}>}
 */
export async function extractPdfToMarkdown(arrayBuffer, { onProgress } = {}) {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;

  let totalTextItems = 0;
  const pages = [];

  for (let i = 1; i <= pageCount; i++) {
    onProgress?.({ phase: 'extracting', current: i, total: pageCount });
    const page        = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items       = (textContent.items || []).filter((item) => item.str?.trim());
    totalTextItems   += items.length;
    pages.push({ pageNum: i, items });
  }

  const looksScanned =
    pageCount > 0 && totalTextItems / pageCount < SCANNED_THRESHOLD;

  let markdown = '';

  for (const { pageNum, items } of pages) {
    markdown += `\n---\n## Page ${pageNum}\n\n`;

    if (items.length === 0) {
      markdown += '*[No text extracted — this page may be a scanned image]*\n';
      continue;
    }

    // Compute page median font size (used for heading detection)
    const fontSizes    = items.map((item) => Math.abs(item.transform[0])).filter((s) => s > 0);
    const medianFontSz = median(fontSizes);

    // Cluster items into rows by Y coordinate
    const rows = clusterByY(items);

    let prevRowY = null;

    // Track whether we're in the middle of a table
    let inTable = false;

    for (const row of rows) {
      const rowY = row[0].transform[5];

      // Emit blank line for large vertical gaps (section breaks)
      if (prevRowY !== null && Math.abs(prevRowY - rowY) > 20) {
        if (inTable) {
          // End of table — emit separator row hint and blank line
          markdown += '\n';
          inTable = false;
        } else {
          markdown += '\n';
        }
      }
      prevRowY = rowY;

      // Sort items in row by X position (left → right)
      row.sort((a, b) => a.transform[4] - b.transform[4]);

      const rowText = row.map((item) => item.str).join(' ').trim();
      if (!rowText) continue;

      if (isTableRow(row)) {
        // Table row — emit pipe-delimited markdown table row
        const cells = splitTableCells(row);
        markdown += `| ${cells.join(' | ')} |\n`;
        inTable = true;
      } else {
        if (inTable) { markdown += '\n'; inTable = false; }

        // Check if heading: font size > 1.3× median
        const rowFontSz = Math.max(...row.map((item) => Math.abs(item.transform[0])));
        if (rowFontSz > medianFontSz * 1.3 && rowText.length < 120) {
          markdown += `### ${rowText}\n`;
        } else {
          markdown += `${rowText}\n`;
        }
      }
    }
  }

  const finalMarkdown = markdown.trim();
  return {
    markdown:    finalMarkdown,
    pageCount,
    charCount:   finalMarkdown.length,
    looksScanned,
  };
}

// ---- Helpers ----

/**
 * Cluster PDF text items into rows by Y coordinate (within `tolerance` px).
 * PDF Y coordinates increase upward, so items on the same visual line share ~same Y.
 */
function clusterByY(items, tolerance = 3) {
  const rows = [];
  // Sort descending by Y so top-of-page items come first
  const sorted = [...items].sort((a, b) => b.transform[5] - a.transform[5]);

  for (const item of sorted) {
    const y = item.transform[5];
    const existing = rows.find(
      (row) => Math.abs(row[0].transform[5] - y) <= tolerance
    );
    if (existing) {
      existing.push(item);
    } else {
      rows.push([item]);
    }
  }
  return rows;
}

/**
 * Heuristic: a row is a "table row" if it has 3+ items separated by
 * gaps > 30 px between adjacent items (accounts for column spacing in FS tables).
 */
function isTableRow(row) {
  if (row.length < 3) return false;
  const sorted    = [...row].sort((a, b) => a.transform[4] - b.transform[4]);
  let largeGaps   = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prevRight = sorted[i - 1].transform[4] + (sorted[i - 1].width || 0);
    const gap       = sorted[i].transform[4] - prevRight;
    if (gap > 30) largeGaps++;
  }
  return largeGaps >= 2;
}

/**
 * For a detected table row, combine adjacent items that are close together
 * into single cells (handles multi-word cell content).
 */
function splitTableCells(row) {
  const sorted = [...row].sort((a, b) => a.transform[4] - b.transform[4]);
  const cells  = [];
  let current  = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prevRight = current[current.length - 1].transform[4]
                    + (current[current.length - 1].width || 0);
    const gap       = sorted[i].transform[4] - prevRight;

    if (gap > 30) {
      cells.push(current.map((x) => x.str).join(' ').trim());
      current = [sorted[i]];
    } else {
      current.push(sorted[i]);
    }
  }
  cells.push(current.map((x) => x.str).join(' ').trim());
  return cells;
}

function median(arr) {
  if (arr.length === 0) return 12;
  const s   = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}
