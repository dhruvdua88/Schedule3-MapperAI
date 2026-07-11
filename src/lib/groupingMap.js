// ============ GROUPING MAPPER — engine ============
//
// Takes a Schedule III Automation Tool trial-balance ("T_B" style) — either
// pasted as TSV or read from an .xlsx/.xlsm/.csv — and, for every ledger,
// proposes a clean three-level grouping that is PASTEABLE straight back into
// the tool's data-validated columns:
//
//     Face Grouping   (Level 1)  — must equal a Drop_List head  (FACE_HEADS)
//     Note Grouping   (Level 2)  — must equal a Drop_List note   (NOTES_BY_FACE)
//     Sub-Note Group  (Level 3)  — free presentation label the AI drafts so the
//                                  face of the balance sheet reads well
//
// The Face/Note come from the tool's own dropdown vocabulary, so a paste never
// breaks the workbook's data validations. The Final Code is then derived
// DETERMINISTICALLY from (Face, Note) — no AI guessing on codes.
//
// AI is used ONLY for judgement (which head, which note, and how to group
// similar ledgers into a tidy sub-note). Everything else is mechanical.
//
// NOT for: reading the whole .xlsb binary workbook (ExcelJS can't) — the user
// copies the T_B columns or saves the sheet as .xlsx. Paste is the primary path.

import { callDeepSeek } from './deepseek.js';
import {
  FACE_HEADS, NOTES_BY_FACE, canonicalFace, canonicalNote, codeFor,
} from '../data/sch3Vocab.js';

// ---- Column detection ---------------------------------------------------
// Header aliases (lower-cased, spaces collapsed) → canonical field.
const HEADER_ALIASES = {
  'name of ledger': 'ledger', 'ledger': 'ledger', 'ledger name': 'ledger',
  'particulars': 'ledger', 'account': 'ledger', 'account name': 'ledger',
  'system primary grouping': 'sysPrimary', 'system parent grouping': 'sysParent',
  'group': 'sysPrimary', 'primary group': 'sysPrimary', 'parent group': 'sysParent',
  'face grouping_current year': 'face', 'face grouping': 'face',
  'face grouping current year': 'face', 'face': 'face',
  'note grouping_current year': 'note', 'note grouping': 'note',
  'note grouping current year': 'note', 'note': 'note',
  'sub-note grouping_current year': 'subNote', 'sub-note grouping': 'subNote',
  'sub note grouping': 'subNote', 'subnote': 'subNote', 'sub-note': 'subNote',
};

function norm(s) {
  return String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Parse a number that may be "(1,234.50)" (bracket-negative) or "-1234.5" or "".
function parseAmt(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  let s = String(v).trim().replace(/,/g, '');
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (s.startsWith('-')) { neg = true; s = s.slice(1); }
  const n = parseFloat(s.replace(/[^0-9.]/g, ''));
  if (!isFinite(n)) return null;
  return neg ? -n : n;
}

/**
 * Parse a raw 2-D grid (array of arrays) into structured ledger rows.
 * Auto-detects the header row (the first row that contains a "ledger" column),
 * then maps known columns by alias. Rows with a non-empty ledger name are kept.
 *
 * If NO recognisable header is found, falls back to: col0 = ledger,
 * col1 = amount (single-column paste of ledger names also works).
 *
 * @returns {{ rows: Array, cols: object, headerRow: number, amountCol: number|null }}
 */
export function parseGrid(grid) {
  if (!Array.isArray(grid) || grid.length === 0) {
    return { rows: [], cols: {}, headerRow: -1, amountCol: null };
  }

  // Find header row = row with the most alias hits, must include a 'ledger'.
  let headerRow = -1, best = {};
  const scan = Math.min(grid.length, 15);
  for (let r = 0; r < scan; r++) {
    const map = {};
    (grid[r] || []).forEach((cell, c) => {
      const key = HEADER_ALIASES[norm(cell)];
      if (key && map[key] === undefined) map[key] = c;
    });
    if (map.ledger !== undefined && Object.keys(map).length > Object.keys(best).length) {
      best = map; headerRow = r;
    }
  }

  let cols = best, amountCol = null;
  if (headerRow === -1) {
    // No header → assume col0 ledger, first numeric-looking col = amount.
    headerRow = -1; cols = { ledger: 0 };
    const probe = grid.find((row) => row && row.some((c) => parseAmt(c) != null));
    if (probe) amountCol = probe.findIndex((c, i) => i > 0 && parseAmt(c) != null);
  } else {
    // Amount = the first column to the RIGHT of ledger that carries a number.
    const start = (cols.ledger ?? 0) + 1;
    const probe = grid.slice(headerRow + 1, headerRow + 40)
      .find((row) => row && parseAmt(row[start]) != null);
    amountCol = probe ? start : (cols.face != null ? cols.face - 1 : start);
  }

  const rows = [];
  for (let r = headerRow + 1; r < grid.length; r++) {
    const row = grid[r] || [];
    const ledger = String(row[cols.ledger] ?? '').trim();
    if (!ledger || norm(ledger) === 'name of ledger') continue;
    // Skip obvious total / blank marker rows.
    if (/^(grand )?total$/i.test(ledger)) continue;
    rows.push({
      idx: rows.length,
      excelRow: r + 1,
      ledger,
      sysPrimary: cols.sysPrimary != null ? String(row[cols.sysPrimary] ?? '').trim() : '',
      sysParent:  cols.sysParent  != null ? String(row[cols.sysParent]  ?? '').trim() : '',
      amount: amountCol != null ? parseAmt(row[amountCol]) : null,
      curFace: cols.face    != null ? String(row[cols.face]    ?? '').trim() : '',
      curNote: cols.note    != null ? String(row[cols.note]    ?? '').trim() : '',
      curSub:  cols.subNote != null ? String(row[cols.subNote] ?? '').trim() : '',
    });
  }
  return { rows, cols, headerRow, amountCol };
}

/** Parse pasted clipboard text (TSV, or CSV) into a grid, then structure it. */
export function parsePasted(text) {
  const raw = String(text || '').replace(/\r\n?/g, '\n').replace(/\n+$/, '');
  if (!raw.trim()) return { rows: [], cols: {}, headerRow: -1, amountCol: null };
  const delim = raw.includes('\t') ? '\t' : (raw.split('\n')[0].includes(',') ? ',' : '\t');
  const grid = raw.split('\n').map((line) => line.split(delim));
  return parseGrid(grid);
}

// ---- Prompt -------------------------------------------------------------

const SYSTEM_PROMPT =
  'You are a senior Indian Chartered Accountant preparing a Schedule III (Division I, ' +
  'Companies Act 2013) balance sheet. You map trial-balance ledgers to the correct ' +
  'Face head and Note grouping, and you draft tidy Sub-Note presentation groups. ' +
  'You never invent Face or Note values outside the supplied controlled vocabulary. ' +
  'Return ONLY valid JSON.';

// Compact the controlled vocabulary for the prompt (face => notes).
function vocabBlock() {
  return FACE_HEADS.map((f) => `- ${f}: ${NOTES_BY_FACE[f].join(' | ')}`).join('\n');
}

function buildUserPrompt(chunk) {
  const ledgers = chunk.map((r) => ({
    i: r.idx,
    ledger: r.ledger,
    sysGroup: [r.sysPrimary, r.sysParent].filter(Boolean).join(' > ') || undefined,
    amount: r.amount ?? undefined,
    curFace: r.curFace || undefined,
    curNote: r.curNote || undefined,
    curSub: r.curSub || undefined,
  }));

  return `CONTROLLED VOCABULARY — Face head : allowed Note groupings
${vocabBlock()}

RULES
1. For EACH ledger return face, note, subNote.
2. "face" MUST be copied verbatim from a Face head above. "note" MUST be copied
   verbatim from that face's allowed Note groupings. Never output anything else.
3. Use the sign of "amount" and the Tally sysGroup as evidence: negative =
   credit balance (liability / income / capital); positive = debit (asset /
   expense). A ledger named like a bank/party/tax tells you its head.
4. If curFace/curNote are already present AND valid for the vocabulary, KEEP them
   unless they are clearly wrong; then set action:"keep". If blank, set
   action:"fill". If you correct a wrong value, set action:"change".
5. subNote — Level 3, drafted by YOU for clean balance-sheet presentation:
   - Give EVERY ledger a subNote (never blank).
   - GROUP similar ledgers under ONE shared, well-worded label so the note reads
     well. Examples: all TDS/TCS ledgers -> "TDS / TCS Payable"; PF & ESI ->
     "PF & ESI Payable"; GST ledgers -> "GST Payable"; multiple vendor advances
     -> "Advances to Vendors"; salary/bonus/incentive payables -> "Employee
     Dues Payable"; audit/professional fee payables -> "Provision for Expenses".
   - Where a ledger must be shown by name (related-party loans, individual
     directors, specific investments), use the cleaned ledger name as subNote.
   - Title Case, <= 6 words, no trailing punctuation, consistent across siblings.
6. confidence: 0-1. reason: <= 12 words, why this head/note.

LEDGERS (JSON):
${JSON.stringify(ledgers)}

RETURN ONLY THIS JSON (one object per ledger, same i):
{"mappings":[{"i":0,"face":"","note":"","subNote":"","action":"fill|keep|change","confidence":0.0,"reason":""}]}`;
}

// ---- Validation ---------------------------------------------------------

function validateMapping(row, m) {
  const face = canonicalFace(m?.face) || canonicalFace(row.curFace);
  let note = '', code = null, status = 'ok', flags = [];

  if (!face) {
    status = 'review';
    flags.push('face not in vocabulary');
  } else {
    note = canonicalNote(face, m?.note) || canonicalNote(face, row.curNote);
    if (!note) { status = 'review'; flags.push('note not valid for face'); }
    else code = codeFor(face, note);
  }

  const subNote = (m?.subNote || row.curSub || '').trim();
  if (!subNote) flags.push('sub-note blank');

  const action = m?.action || (row.curFace ? 'keep' : 'fill');
  const changed =
    (face && norm(face) !== norm(row.curFace)) ||
    (note && norm(note) !== norm(row.curNote)) ||
    (subNote && norm(subNote) !== norm(row.curSub));

  return {
    ...row,
    face, note, subNote, code,
    action, changed,
    status,               // 'ok' | 'review'
    flags,
    confidence: typeof m?.confidence === 'number' ? m.confidence : null,
    reason: m?.reason || '',
    accepted: true,       // reviewer can toggle later
  };
}

// ---- Runner -------------------------------------------------------------

const CHUNK_SIZE = 55;

/**
 * Map all ledgers. Fires per-chunk DeepSeek calls concurrently.
 *
 * @param {object} opts
 * @param {Array}  opts.rows      - parsed rows from parseGrid/parsePasted
 * @param {string} opts.apiKey
 * @param {string} [opts.model]   - default 'deepseek-chat'
 * @param {AbortSignal} [opts.signal]
 * @param {(done:number,total:number)=>void} [opts.onProgress]
 * @param {(u)=>void} [opts.onUsage]
 * @returns {Promise<{ results: Array, stats: object }>}
 */
export async function mapGroupings({
  rows, apiKey, model = 'deepseek-chat', signal, onProgress, onUsage,
}) {
  if (!apiKey) throw new Error('Add your DeepSeek API key to run the mapping.');
  if (!rows?.length) throw new Error('No ledgers found to map. Check the pasted data or file.');

  const chunks = [];
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) chunks.push(rows.slice(i, i + CHUNK_SIZE));

  let done = 0;
  const byIdx = new Map();

  await Promise.all(chunks.map(async (chunk) => {
    let parsed = null;
    try {
      parsed = await callDeepSeek({
        apiKey, model, signal,
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: buildUserPrompt(chunk),
        temperature: 0.0, top_p: 0.1,
        timeoutMs: 180_000,
        onUsage,
      });
    } catch (err) {
      // Degrade: this chunk yields validated-from-current-values rows flagged for review.
      parsed = { mappings: chunk.map((r) => ({ i: r.idx })) };
      parsed._error = err.message;
    }
    const list = Array.isArray(parsed?.mappings) ? parsed.mappings : [];
    const map = new Map(list.map((m) => [m.i, m]));
    chunk.forEach((r) => {
      const v = validateMapping(r, map.get(r.idx) || {});
      if (parsed._error) { v.status = 'review'; v.flags = [...v.flags, 'AI call failed — verify manually']; }
      byIdx.set(r.idx, v);
    });
    done += chunk.length;
    if (onProgress) onProgress(Math.min(done, rows.length), rows.length);
  }));

  const results = rows.map((r) => byIdx.get(r.idx)).filter(Boolean);

  const stats = {
    total: results.length,
    filled: results.filter((r) => r.action === 'fill').length,
    changed: results.filter((r) => r.action === 'change').length,
    kept: results.filter((r) => r.action === 'keep').length,
    review: results.filter((r) => r.status === 'review').length,
    subNoteGroups: new Set(results.map((r) => r.subNote).filter(Boolean)).size,
  };

  return { results, stats };
}

// ---- Output builders ----------------------------------------------------

/** TSV of just the 3 grouping columns (Face, Note, Sub-Note) in row order —
 *  paste directly into the tool's G:I. Only accepted rows are written. */
export function toGroupingTSV(results) {
  return results
    .filter((r) => r.accepted)
    .map((r) => [r.face, r.note, r.subNote].join('\t'))
    .join('\n');
}

/** Full review TSV incl. ledger, amount and code — for records / re-paste with a key column. */
export function toFullTSV(results) {
  const head = ['Name of Ledger', 'Amount', 'Face Grouping', 'Note Grouping', 'Sub-Note Grouping', 'Code', 'Action', 'Confidence', 'Reason'];
  const body = results.map((r) => [
    r.ledger, r.amount ?? '', r.face, r.note, r.subNote, r.code ?? '',
    r.action, r.confidence ?? '', r.reason,
  ].join('\t'));
  return [head.join('\t'), ...body].join('\n');
}

// ---- Excel export (ExcelJS, lazy from CDN — same as the rest of the app) ----
function loadExcelJS() {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.ExcelJS) return resolve(window.ExcelJS);
    const existing = document.querySelector('script[data-exceljs]');
    if (existing) {
      existing.addEventListener('load', () => window.ExcelJS ? resolve(window.ExcelJS) : reject(new Error('ExcelJS load incomplete')));
      existing.addEventListener('error', () => reject(new Error('ExcelJS script failed')));
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    s.async = true; s.dataset.exceljs = 'true';
    let done = false;
    s.onload = () => { if (!done) { done = true; window.ExcelJS ? resolve(window.ExcelJS) : reject(new Error('ExcelJS not on window')); } };
    s.onerror = () => { if (!done) { done = true; reject(new Error('Failed to load ExcelJS')); } };
    setTimeout(() => { if (!done) { done = true; reject(new Error('CDN load timeout')); } }, 12000);
    document.head.appendChild(s);
  });
}

export async function downloadMappingExcel(results, companyName = 'Grouping') {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Grouping Map');
  ws.columns = [
    { header: 'Name of Ledger', key: 'ledger', width: 42 },
    { header: 'Amount', key: 'amount', width: 16 },
    { header: 'Face Grouping', key: 'face', width: 30 },
    { header: 'Note Grouping', key: 'note', width: 34 },
    { header: 'Sub-Note Grouping', key: 'sub', width: 28 },
    { header: 'Code', key: 'code', width: 10 },
    { header: 'Action', key: 'action', width: 10 },
    { header: 'Confidence', key: 'conf', width: 11 },
    { header: 'Reason', key: 'reason', width: 40 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3D2E' } };
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFAF6EE' } };
  results.forEach((r) => {
    const row = ws.addRow({
      ledger: r.ledger, amount: r.amount ?? '', face: r.face, note: r.note,
      sub: r.subNote, code: r.code ?? '', action: r.action,
      conf: r.confidence ?? '', reason: r.reason,
    });
    if (r.status === 'review') {
      row.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF3F0' } }; });
    } else if (r.action === 'fill') {
      row.getCell('sub').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F7EE' } };
    }
  });
  ws.autoFilter = 'A1:I1';
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safe = String(companyName).replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 40) || 'Grouping';
  a.href = url; a.download = `${safe}_grouping_map.xlsx`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Read an uploaded .xlsx/.xlsm/.csv into a grid the parser understands.
 *  Picks the sheet whose header row contains a "ledger" column (or the largest). */
export async function readWorkbookToGrid(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await file.text();
    return text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.split(','));
  }
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());

  let bestGrid = null, bestScore = -1;
  wb.eachSheet((ws) => {
    const grid = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const arr = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        let v = cell.value;
        if (v && typeof v === 'object') v = v.result ?? v.text ?? v.richText?.map((t) => t.text).join('') ?? '';
        arr[col - 1] = v == null ? '' : v;
      });
      grid.push(arr);
    });
    // Score: does any of the first 15 rows look like a ledger header?
    let score = 0;
    for (let r = 0; r < Math.min(grid.length, 15); r++) {
      if ((grid[r] || []).some((c) => HEADER_ALIASES[norm(c)] === 'ledger')) { score = 1000 + grid.length; break; }
    }
    if (score === 0) score = grid.length; // fallback: biggest sheet
    if (score > bestScore) { bestScore = score; bestGrid = grid; }
  });
  return bestGrid || [];
}
