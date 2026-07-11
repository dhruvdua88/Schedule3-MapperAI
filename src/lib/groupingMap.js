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
// The Face/Note come from the tool's OWN dependent-dropdown vocabulary
// (extracted from the workbook's data-validation named ranges), so a paste
// never breaks the workbook's validations. Sub-Note is free text (no dropdown).
//
// AI is used ONLY for judgement (which head, which note, and how to group
// similar ledgers into a tidy sub-note). Everything else is mechanical.
//
// NOT for: reading the whole .xlsb binary workbook (ExcelJS can't) — the user
// copies the T_B columns or saves the sheet as .xlsx. Paste is the primary path.

import { callDeepSeek } from './deepseek.js';
import {
  FACE_HEADS, NOTES_BY_FACE, canonicalFace, canonicalNote,
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

  return `You are filling the Schedule III Automation Tool's grouping columns. The
tool ENFORCES these exact data validations (dependent dropdowns):
  * Face grouping (col G): must be one of the Face heads listed below.
  * Note grouping (col H): dependent dropdown = INDIRECT(SUBSTITUTE(Face," ","_")).
    It MUST be one of THAT face's allowed notes listed below — nothing else, or
    the paste breaks the workbook's validation.
  * Sub-Note grouping (col I): free text (no dropdown) — YOU draft it for a clean
    balance-sheet presentation.

VALIDATION VOCABULARY — "Face head" => allowed Note groupings (verbatim):
${vocabBlock()}

RULES
1. For EACH ledger return face, note, subNote.
2. "face" MUST be copied character-for-character from a Face head above. "note"
   MUST be copied character-for-character from THAT face's allowed notes above.
   Do not paraphrase, re-case, singularise, or invent — an unlisted value is a
   validation error. If the ledger truly fits no listed note, pick the face's
   "Specify at level 3" (if present) and put the detail in subNote.
3. Use the sign of "amount" and the Tally sysGroup as evidence: negative =
   credit balance (liability / income / capital); positive = debit (asset /
   expense). A ledger named like a bank/party/tax tells you its head.
   Examples honouring the lists: TDS/GST/PF/ESI/Prof-tax payable ->
   "Other current liabilities" > "Statutory dues"; vendor advances ->
   "Short term loans and advances" > "Advances to suppliers"; prepaid/interest
   accrued receivable -> "Other current assets" > "Others"/"Interest accrued".
3a. DISAMBIGUATION — always pick a listed note, never leave it blank:
   - "credit card" (Axis/HDFC/Kotak etc. card, credit balance) -> "Other current
     liabilities" > "Other payables" (card dues repayable).
   - Clearing & forwarding / C&F / freight / cartage (expense) -> "Other expenses"
     > "Freight outward" (outward) or "Freight Inward" (inward/purchase).
   - "share application money" RECEIVED (credit) -> face "Share application money
     pending allotment" > "Specify at level 3"; share application money PAID by us
     (debit, an asset) -> "Short term loans and advances" > "Others".
   - Rent/electricity/utility PAYABLE, or a bare person/party name with a credit
     balance and no loan context, under current liabilities -> "Other payables".
   - Security/rent DEPOSIT paid (debit, non-current) -> "Other non current assets"
     > "Security Deposits"; if clearly < 12 months -> "Short term loans and
     advances" > "Others".
   - GST input / ITC / RCM input (debit) -> "Other current assets" > "Others".
   - Bank overdraft / cash-credit / OD / CC limit (credit) is SECURED against
     current assets -> "Short term borrowings" > "Secured Loans repayable on
     demand from banks" (NOT the Unsecured line). Interest on OD -> "Finance
     costs" > "Interest expense".
   - When still genuinely unsure of the note, use the face's catch-all that IS in
     its list — "Other payables" / "Others" / "Other Expenses" / "Specify at level
     3" — rather than returning an empty note.
4. If curFace/curNote are already present AND valid (appear verbatim in the lists),
   KEEP them unless clearly wrong; then action:"keep". If blank, action:"fill".
   If you correct a wrong/unlisted value, action:"change".
5. subNote — Level 3, drafted by YOU for clean balance-sheet presentation:
   - GROUP similar ledgers under ONE shared, well-worded label so the note reads
     well. Examples: all TDS/TCS ledgers -> "TDS / TCS Payable"; PF & ESI ->
     "PF & ESI Payable"; GST ledgers -> "GST Payable"; multiple vendor advances
     -> "Advances to Vendors"; salary/bonus/incentive payables -> "Employee
     Dues Payable"; audit/professional fee payables -> "Provision for Expenses".
   - LEAVE subNote BLANK ("") for Trade payables (creditors) and Trade
     receivables (debtors) — these are shown in aggregate with an MSME/others +
     ageing schedule, NOT by individual party. Never put a party name there.
   - Otherwise where a ledger must be shown by name (related-party loans,
     individual directors, specific investments), use the cleaned ledger name.
   - SUFFIX CONSISTENCY: for a liability-side note end the label "... Payable"
     (never "Dues"/"Outstanding"); for an asset-side note use "... Receivable" or
     "Advance to ...". Keep the SAME suffix for every sibling so they render as
     one line, e.g. always "Credit Card Payable" (not sometimes "Credit Card Dues").
   - Title Case, <= 6 words, no trailing punctuation, consistent across siblings.
6. confidence: 0-1. reason: <= 12 words, why this head/note.

LEDGERS (JSON):
${JSON.stringify(ledgers)}

RETURN ONLY THIS JSON (one object per ledger, same i):
{"mappings":[{"i":0,"face":"","note":"","subNote":"","action":"fill|keep|change","confidence":0.0,"reason":""}]}`;
}

// ---- Validation ---------------------------------------------------------

// Faces shown in aggregate + ageing schedule — individual parties are never
// listed on the face of the BS, so these carry NO per-ledger sub-note.
const AGGREGATE_FACES = new Set([
  'Trade payables due to MSME',
  'Trade payables due to others',
  'Trade receivables',
]);

// Generic "bucket" notes, in preference order — used to complete a valid face
// whose note the AI left blank, so the paste is never incomplete. All are real
// dropdown values; only assigned when present in that face's allowed list.
const CATCHALL_NOTES = [
  'Other payables', 'Others', 'Other Expenses', 'Other investments',
  'Other non-current investments', 'Miscellaneous expenses', 'Specify at level 3',
];

function validateMapping(row, m) {
  const face = canonicalFace(m?.face) || canonicalFace(row.curFace);
  let note = '', status = 'ok', flags = [];

  if (!face) {
    status = 'review';
    flags.push('face not in the tool\'s Face list');
  } else {
    note = canonicalNote(face, m?.note) || canonicalNote(face, row.curNote);
    const opts = NOTES_BY_FACE[face] || [];
    // Deterministic fallback: if the face's dependent dropdown has exactly one
    // valid note (e.g. "Captured from FAR"), assign it — no ambiguity.
    if (!note && opts.length === 1) note = opts[0];
    // Catch-all: a valid face but a note the AI left blank must not paste empty.
    // Assign the face's generic bucket note (still in-vocab) and flag it so the
    // reviewer confirms — never leave a resolvable face with an empty note.
    if (!note) {
      const catchAll = CATCHALL_NOTES.find((c) => opts.includes(c));
      if (catchAll) { note = catchAll; flags.push('catch-all note assigned — confirm'); }
    }
    if (!note) { status = 'review'; flags.push('no note could be assigned for this face'); }
  }

  // Faces that are presented in AGGREGATE (with an ageing / MSME-vs-others
  // schedule) and NEVER line up individual party ledgers on the face or in the
  // note — trade payables (creditors) and trade receivables (debtors). A
  // per-party sub-note there is wrong, so force it blank regardless of the AI.
  let subNote = (m?.subNote || row.curSub || '').trim();
  if (face && AGGREGATE_FACES.has(face)) {
    subNote = '';
  } else if (!subNote) {
    flags.push('sub-note blank');
  }

  const action = m?.action || (row.curFace ? 'keep' : 'fill');
  const changed =
    (face && norm(face) !== norm(row.curFace)) ||
    (note && norm(note) !== norm(row.curNote)) ||
    (subNote && norm(subNote) !== norm(row.curSub));

  return {
    ...row,
    face, note, subNote,
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

  // Deterministic presentation pass, in order:
  //  (a) canonical sub-notes for well-known statutory/tax patterns (reproducible,
  //      collapses AI wording drift for the biggest clusters);
  //  (b) surface-form normalise (casing/spacing/noise);
  //  (c) token-set canonicalise within each bucket (word-order/plural/status).
  const deterministicNotes = applyDeterministicNotes(results);
  const deterministicSubNotes = applyDeterministicSubNotes(results);
  for (const r of results) if (r.subNote) r.subNote = formatSubNote(r.subNote);
  const subNoteMerges = canonicalizeSubNotes(results);

  const stats = {
    total: results.length,
    filled: results.filter((r) => r.action === 'fill').length,
    changed: results.filter((r) => r.action === 'change').length,
    kept: results.filter((r) => r.action === 'keep').length,
    review: results.filter((r) => r.status === 'review').length,
    subNoteGroups: new Set(results.map((r) => r.subNote).filter(Boolean)).size,
    subNoteMerges,
    deterministicSubNotes,
    deterministicNotes,
  };

  return { results, stats };
}

// ---- Deterministic MAIN-NOTE corrections (unmistakable, in-vocab) --------
// A few ledger patterns have a Schedule III note that is not a judgement call.
// Correct the AI's note ONLY when the pattern is unmistakable AND the target
// note is valid for the face the AI already chose (never changes the face).
// e.g. a bank overdraft / cash-credit is SECURED against current assets, so it
// belongs in "Secured Loans repayable on demand from banks", not the Unsecured
// line the model sometimes picks.
const _NOTE_RULES = [
  {
    face: 'Short term borrowings',
    re: /overdraft|\bo\/?d\b|cash\s*credit|\bcc\s*(a\/?c|limit|account)|bank.*\bod\b/i,
    note: 'Secured Loans repayable on demand from banks',
  },
];
export function applyDeterministicNotes(results) {
  let n = 0;
  for (const r of results) {
    if (!r.face) continue;
    const hit = _NOTE_RULES.find((x) => x.face === r.face && x.re.test(r.ledger));
    if (hit && (NOTES_BY_FACE[r.face] || []).includes(hit.note) && r.note !== hit.note) {
      r.note = hit.note;
      if (!r.flags.includes('deterministic note')) r.flags.push('deterministic note');
      n++;
    }
  }
  return n;
}

// ---- Deterministic sub-note dictionary (well-known statutory/tax lines) --
// For the highest-frequency, unambiguous ledger patterns, force a single
// canonical sub-note so presentation is REPRODUCIBLE run-to-run and every
// sibling collapses to one line — e.g. all input-GST/ITC ledgers (however
// worded) become "GST Input Credit". Keyed on the ledger name AND the face
// SIDE (asset vs liability) so an expense like "Admin Charges on PF" is never
// mislabelled "PF Payable". Only overrides when the pattern is unmistakable.
const _ASSET_FACES = new Set([
  'Property Plant and Equipment', 'Intangible assets', 'Capital work in progress',
  'Intangible assets under development', 'Non current investments', 'Current investments',
  'Deferred tax assets net', 'Long term loans and advances', 'Short term loans and advances',
  'Other non current assets', 'Other current assets', 'Inventories', 'Trade receivables',
  'Cash and Cash Equivalents',
]);
const _LIAB_FACES = new Set([
  'Other current liabilities', 'Other Long term liabilities',
  'Short term provisions', 'Long term provisions',
]);
// { re: ledger test, side: 'asset'|'liab', sub: canonical } — first match wins.
const _DSUB_RULES = [
  { re: /(input|itc)\s*(c|s|i|ut)?gst|(c|s|i|ut)?gst\s*(input|itc|credit)|\binput tax credit\b|\bitc\b/i, side: 'asset', sub: 'GST Input Credit' },
  { re: /\btds\b|tax deducted at source/i,               side: 'asset', sub: 'TDS Receivable' },
  { re: /\btds\b|\btcs\b|tax deducted|tax collected/i,   side: 'liab',  sub: 'TDS Payable' },
  { re: /provident\s*fund|\bepf\b|\bp\.?f\.?\b/i,        side: 'liab',  sub: 'PF Payable' },
  { re: /\besic?\b|employee'?s?\s*state\s*insurance/i,   side: 'liab',  sub: 'ESIC Payable' },
  { re: /profession(al)?\s*tax|\bp\.?tax\b/i,            side: 'liab',  sub: 'Profession Tax Payable' },
];
export function applyDeterministicSubNotes(results) {
  let n = 0;
  for (const r of results) {
    if (!r.face || AGGREGATE_FACES.has(r.face)) continue;   // aggregate faces carry no sub-note
    const side = _ASSET_FACES.has(r.face) ? 'asset' : _LIAB_FACES.has(r.face) ? 'liab' : null;
    if (!side) continue;                                    // expense/income/equity — leave AI's label
    const hit = _DSUB_RULES.find((rule) => rule.side === side && rule.re.test(r.ledger));
    if (hit && r.subNote !== hit.sub) {
      r.subNote = hit.sub;
      if (!r.flags.includes('deterministic sub-note')) r.flags.push('deterministic sub-note');
      n++;
    }
  }
  return n;
}

// ---- Deterministic sub-note presentation formatting ---------------------
// Uniform surface form so lines read consistently on the face of the BS.
// Fixes: whitespace, "&" spacing, trailing bookkeeping noise, and casing —
// Title Case for ordinary words, small joining words kept lower (unless first),
// and known accounting acronyms forced UPPER so "gst"/"Gst"/"GST" never diverge.
const _SUBNOTE_ACRONYMS = new Set([
  'TDS', 'TCS', 'GST', 'CGST', 'SGST', 'IGST', 'UTGST', 'RCM', 'ITC', 'HSN',
  'PF', 'ESI', 'ESIC', 'PT', 'MLWF', 'LWF', 'MAT', 'TAN', 'PAN', 'GSTIN',
  'CCTV', 'AMC', 'EMI', 'NEFT', 'RTGS', 'IMPS', 'UPI', 'POS', 'OD', 'CC',
  'HDFC', 'ICICI', 'SBI', 'IDBI', 'RBL', 'IDFC', 'PNB', 'BOB', 'L&T',
  'MSME', 'TReDS', 'ROC', 'MCA', 'DTA', 'DTL', 'FD', 'RD', 'NBFC',
]);
const _SUBNOTE_SMALL = new Set(['of', 'to', 'and', 'for', 'on', 'in', 'the', 'a', 'an', 'at', 'by', 'as', 'or']);
const _SUBNOTE_TAIL = /\s*[-–—]?\s*(a\/c|account|ledger|g\/l)\.?$/i;

export function formatSubNote(raw) {
  if (!raw) return '';
  let s = String(raw).replace(/\s+/g, ' ').trim();
  s = s.replace(_SUBNOTE_TAIL, '').trim();      // strip "A/c"/"Account"/"Ledger" tail FIRST
  // Space out initials glued by a dot ("S.santha" -> "S. santha") so the name
  // part gets cased; digits (2.5) are untouched (both sides must be letters).
  s = s.replace(/([A-Za-z])\.([A-Za-z])/g, '$1. $2');
  // Space "&" and "/" only when they join full words (≥2 chars each) — keeps
  // "L&T" and "A/c" tight while fixing "Repairs&Maintenance", "TDS/TCS".
  s = s.replace(/(\w{2,})\s*&\s*(\w{2,})/g, '$1 & $2');
  s = s.replace(/(\w{2,})\s*\/\s*(\w{2,})/g, '$1 / $2');
  s = s.replace(/\s{2,}/g, ' ').trim();
  // Case EVERY alphanumeric run (not just space-delimited tokens) so words after
  // "(", "-" or "." also format — "(gst)" -> "(GST)", "-adaptor" -> "-Adaptor".
  s = s.replace(/[A-Za-z][A-Za-z0-9]*/g, (w, offset, full) => {
    const up = w.toUpperCase();
    if (_SUBNOTE_ACRONYMS.has(up)) return up;                 // known acronym
    if (/^[A-Z0-9]{2,5}$/.test(w) && !/[a-z]/.test(w)) return w; // already an acronym (CCTV)
    const lw = w.toLowerCase();
    const atWordStart = offset === 0 || full[offset - 1] === ' ';
    if (offset > 0 && atWordStart && _SUBNOTE_SMALL.has(lw)) return lw; // small joining word
    return lw.charAt(0).toUpperCase() + lw.slice(1);          // Title Case
  });
  return s.replace(/\s{2,}/g, ' ').trim();
}

// ---- Deterministic sub-note canonicalisation ----------------------------
// Within one (Face, Note) bucket, sub-notes that reduce to the SAME token set
// after lower-casing, dropping punctuation/noise words, and singularising are
// the same presentation line written differently ("Input CGST Credit" vs
// "CGST Input Credit"; "Advances to Vendors" vs "Advance to Vendor"). Collapse
// each such family to one canonical surface form = the most frequent variant
// (tie -> shortest -> alphabetical). This is conservative: genuinely different
// items keep different token sets (CGST vs IGST, TDS vs TCS) and are NOT merged.
const _SUBNOTE_STOP = new Set([
  'the', 'a', 'an', 'to', 'of', 'and', 'for', 'on', 'in', 'as',
  // status / polarity suffixes — same concept whether written "Dues", "Payable",
  // "Outstanding" or "Paid" (e.g. "Credit Card Dues" == "Credit Card Payable",
  // "Custom Duty" == "Custom Duty Paid"). Dropping them merges the split line.
  'payable', 'payables', 'receivable', 'receivables',
  'due', 'dues', 'outstanding', 'paid', 'payment', 'recoverable',
  'ac', 'account', 'accounts',
]);
function subNoteKey(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/)
    .filter(Boolean).map((w) => w.replace(/s$/, ''))
    .filter((w) => !_SUBNOTE_STOP.has(w)).sort().join(' ');
}
export function canonicalizeSubNotes(results) {
  const families = new Map(); // face|note|tokenKey -> Map(surface -> count)
  for (const r of results) {
    if (!r.subNote) continue;
    const k = subNoteKey(r.subNote);
    if (!k) continue;                       // sub-note was only noise words
    const key = `${r.face}|${r.note}|${k}`;
    if (!families.has(key)) families.set(key, new Map());
    const m = families.get(key);
    m.set(r.subNote, (m.get(r.subNote) || 0) + 1);
  }
  const canonical = new Map();
  for (const [key, m] of families) {
    if (m.size < 2) { canonical.set(key, [...m.keys()][0]); continue; }
    const best = [...m.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].length - b[0].length || a[0].localeCompare(b[0]),
    )[0][0];
    canonical.set(key, best);
  }
  let merged = 0;
  for (const r of results) {
    if (!r.subNote) continue;
    const k = subNoteKey(r.subNote);
    if (!k) continue;
    const c = canonical.get(`${r.face}|${r.note}|${k}`);
    if (c && c !== r.subNote) { r.subNote = c; merged++; }
  }
  return merged;
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
  const head = ['Name of Ledger', 'Amount', 'Face Grouping', 'Note Grouping', 'Sub-Note Grouping', 'Action', 'Confidence', 'Reason'];
  const body = results.map((r) => [
    r.ledger, r.amount ?? '', r.face, r.note, r.subNote,
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
      sub: r.subNote, action: r.action,
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
 *  Picks the sheet whose header row contains a "ledger" column (or the largest).
 *
 *  Uses SheetJS (xlsx) — lazy-loaded from CDN — so it reads EVERY spreadsheet
 *  format the preparer's tool emits: .xlsx / .xlsm / .xlsb (binary) / .xls /
 *  .ods / .csv. ExcelJS can't parse .xlsb; SheetJS can. */
function loadSheetJS() {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.XLSX) return resolve(window.XLSX);
    const existing = document.querySelector('script[data-sheetjs]');
    if (existing) {
      existing.addEventListener('load', () => window.XLSX ? resolve(window.XLSX) : reject(new Error('SheetJS load incomplete')));
      existing.addEventListener('error', () => reject(new Error('SheetJS script failed')));
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    s.async = true; s.dataset.sheetjs = 'true';
    let done = false;
    s.onload = () => { if (!done) { done = true; window.XLSX ? resolve(window.XLSX) : reject(new Error('SheetJS not on window')); } };
    s.onerror = () => { if (!done) { done = true; reject(new Error('Failed to load SheetJS from cdn.sheetjs.com')); } };
    setTimeout(() => { if (!done) { done = true; reject(new Error('CDN load timeout (12 s)')); } }, 12000);
    document.head.appendChild(s);
  });
}

export async function readWorkbookToGrid(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await file.text();
    return text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.split(','));
  }
  const XLSX = await loadSheetJS();
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true, dense: false });

  // Choose the sheet that best looks like a grouping trial balance: score a
  // header row by how many of the KEY fields (ledger, face, note, subNote) it
  // carries — NOT by row count. A T_B sheet with all four beats a Notes sheet
  // that merely has a "Particulars"/"Name of Ledger" column.
  const KEY_FIELDS = ['ledger', 'face', 'note', 'subNote'];
  let bestGrid = null, bestScore = -1;
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: true });
    let fields = 0;
    for (let r = 0; r < Math.min(grid.length, 15); r++) {
      const hit = new Set();
      (grid[r] || []).forEach((c) => { const k = HEADER_ALIASES[norm(c)]; if (KEY_FIELDS.includes(k)) hit.add(k); });
      if (hit.has('ledger')) fields = Math.max(fields, hit.size);
    }
    // Primary: field richness (needs ledger). Fallback: biggest sheet (÷1e5 so it never outranks a real match).
    const score = fields > 0 ? fields * 1e6 + grid.length : grid.length / 1e5;
    if (score > bestScore) { bestScore = score; bestGrid = grid; }
  }
  return bestGrid || [];
}
