// ============ METRICS EXTRACT — DETERMINISTIC ============
//
// Regex-driven extraction of key financial figures from the extracted
// markdown. This module is the foundation of the rule engine — both the
// arithmetic checks and the CARO applicability gate consume the same
// keyMetrics shape that DeepSeek's SCH3 prompt produces.
//
// Strategy:
//   1. Detect the document's rounding unit from header text
//      ("Rupees in lakhs" / "Rs in crores" / etc.). Default to "absolute".
//   2. For each known label, try a prioritised list of regex patterns
//      against the markdown. First match wins.
//   3. Normalise every matched amount to "lakhs" so the output shape
//      matches the existing keyMetrics consumers.
//   4. Return field-level confidence — 'high' (exact label match),
//      'medium' (alternate label match), 'low' (fuzzy / nearby figure).
//
// This is intentionally conservative. When no high-confidence match is
// found, the field is left undefined; downstream rule-engine arithmetic
// checks skip rather than emit a false positive.

// ───────────────────────────────────────────────────────────
// Rounding-unit detection
// ───────────────────────────────────────────────────────────
const ROUNDING_PATTERNS = [
  { unit: 'crores',   factorToLakhs: 100,     pattern: /(rs?\.?|rupees?)\s+in\s+crores?\b/i },
  { unit: 'crores',   factorToLakhs: 100,     pattern: /(₹|inr)\s+in\s+crores?\b/i },
  { unit: 'crores',   factorToLakhs: 100,     pattern: /amount(s)?\s+in\s+crores?\b/i },
  { unit: 'lakhs',    factorToLakhs: 1,       pattern: /(rs?\.?|rupees?)\s+in\s+lakhs?\b/i },
  { unit: 'lakhs',    factorToLakhs: 1,       pattern: /(₹|inr)\s+in\s+lakhs?\b/i },
  { unit: 'lakhs',    factorToLakhs: 1,       pattern: /amount(s)?\s+in\s+lakhs?\b/i },
  { unit: 'millions', factorToLakhs: 10,      pattern: /(rs?\.?|rupees?|inr|₹)\s+in\s+millions?\b/i },
  { unit: 'millions', factorToLakhs: 10,      pattern: /amount(s)?\s+in\s+millions?\b/i },
  { unit: 'thousands',factorToLakhs: 0.01,    pattern: /(rs?\.?|rupees?|inr|₹)\s+in\s+thousands?\b/i },
  { unit: 'thousands',factorToLakhs: 0.01,    pattern: /amount(s)?\s+in\s+thousands?\b/i },
  { unit: 'hundreds', factorToLakhs: 0.001,   pattern: /(rs?\.?|rupees?|inr|₹)\s+in\s+hundreds?\b/i },
];

export function detectRounding(markdown) {
  if (!markdown) return { unit: 'absolute', factorToLakhs: 0.00001 };
  const top = markdown.slice(0, 5000); // rounding policy usually appears in header / Note 2
  for (const r of ROUNDING_PATTERNS) {
    if (r.pattern.test(top)) {
      return { unit: r.unit, factorToLakhs: r.factorToLakhs };
    }
  }
  return { unit: 'absolute', factorToLakhs: 0.00001 };
}

// ───────────────────────────────────────────────────────────
// Amount parser — "1,23,456.78" / "(123,456)" → number
// Handles Indian comma grouping and brackets for negatives.
// ───────────────────────────────────────────────────────────
export function parseIndianAmount(s) {
  if (s == null) return null;
  let t = String(s).trim();
  if (!t) return null;
  const isNegative = /^\(.*\)$/.test(t) || /^-/.test(t);
  t = t.replace(/[()\s₹]/g, '').replace(/,/g, '').replace(/^-/, '');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = parseFloat(t);
  if (!isFinite(n)) return null;
  return isNegative ? -n : n;
}

// ───────────────────────────────────────────────────────────
// Field patterns
// Each field has a prioritised list of regexes. The first match wins.
// The capturing group is the amount.
// ───────────────────────────────────────────────────────────
// Generic amount tail — accepts numbers like "1,23,456.78", "(123,456)", "1234".
const AMT = '\\(?\\s*([\\d,]+(?:\\.\\d+)?)\\s*\\)?';

const FIELD_PATTERNS = {
  // ── P&L
  revenueLakhs: [
    { re: new RegExp(`revenue\\s+from\\s+operations[^\\n]*?${AMT}`, 'i'),        conf: 'high' },
    { re: new RegExp(`(?:total\\s+)?revenue(?:\\s+from\\s+operations)?\\s*\\(?[ivxl]+\\)?[^\\n]*?${AMT}`, 'i'), conf: 'medium' },
  ],
  profitBeforeTaxLakhs: [
    { re: new RegExp(`profit\\s+(?:/?\\s*\\(loss\\))?\\s+before\\s+tax[^\\n]*?${AMT}`, 'i'), conf: 'high' },
    { re: new RegExp(`pbt[^\\n]*?${AMT}`, 'i'),                                            conf: 'medium' },
  ],
  profitAfterTaxLakhs: [
    { re: new RegExp(`profit\\s+(?:/?\\s*\\(loss\\))?\\s+(?:for\\s+the\\s+(?:year|period)|after\\s+tax)[^\\n]*?${AMT}`, 'i'), conf: 'high' },
    { re: new RegExp(`pat[^\\n]*?${AMT}`, 'i'),                                            conf: 'medium' },
  ],
  currentTaxLakhs: [
    { re: new RegExp(`current\\s+tax(?!\\s*assets)[^\\n]*?${AMT}`, 'i'), conf: 'high' },
    { re: new RegExp(`tax\\s+expense\\s*[:\\-—]?\\s*current[^\\n]*?${AMT}`, 'i'), conf: 'medium' },
  ],
  advanceTaxLakhs: [
    { re: new RegExp(`advance\\s+(?:income\\s+)?tax(?:\\s+\\(net\\s+of\\s+provision\\))?[^\\n]*?${AMT}`, 'i'), conf: 'high' },
  ],

  // ── Balance Sheet — Equity & Liabilities
  paidUpCapitalLakhs: [
    { re: new RegExp(`(?:total\\s+)?(?:issued,?\\s+subscribed\\s+and\\s+(?:fully\\s+)?paid[\\s-]*up|paid[\\s-]*up)\\s+(?:equity\\s+)?(?:share\\s+)?capital[^\\n]*?${AMT}`, 'i'), conf: 'high' },
    { re: new RegExp(`equity\\s+share\\s+capital[^\\n]*?${AMT}`, 'i'), conf: 'medium' },
  ],
  reservesLakhs: [
    { re: new RegExp(`(?:total\\s+)?reserves?\\s+(?:and|&)\\s+surplus[^\\n]*?${AMT}`, 'i'), conf: 'high' },
    { re: new RegExp(`other\\s+equity[^\\n]*?${AMT}`, 'i'), conf: 'medium' },
  ],
  totalBorrowingsLakhs: [
    { re: new RegExp(`total\\s+borrowings[^\\n]*?${AMT}`, 'i'), conf: 'high' },
    // Sum of long-term + short-term — handled by ruleEngine if neither line matches.
  ],

  // ── Balance Sheet — Assets
  totalAssetsLakhs: [
    { re: new RegExp(`total\\s+assets[^\\n]*?${AMT}`, 'i'), conf: 'high' },
  ],
  tradeReceivablesLakhs: [
    { re: new RegExp(`(?:total\\s+)?trade\\s+receivables?[^\\n]*?${AMT}`, 'i'), conf: 'high' },
  ],
  fixedAssetsLakhs: [
    { re: new RegExp(`(?:total\\s+)?(?:property,?\\s+plant\\s+(?:and|&)\\s+equipment|fixed\\s+assets|tangible\\s+assets)[^\\n]*?${AMT}`, 'i'), conf: 'high' },
  ],
  inventoriesLakhs: [
    { re: new RegExp(`(?:total\\s+)?inventor(?:y|ies)[^\\n]*?${AMT}`, 'i'), conf: 'high' },
  ],
  cashAndEquivalentsLakhs: [
    { re: new RegExp(`cash\\s+and\\s+cash\\s+equivalents[^\\n]*?${AMT}`, 'i'), conf: 'high' },
  ],
  totalEquityAndLiabilitiesLakhs: [
    { re: new RegExp(`total\\s+(?:equity\\s+(?:and|&)\\s+liabilities|liabilities\\s+(?:and|&)\\s+equity)[^\\n]*?${AMT}`, 'i'), conf: 'high' },
  ],
};

// ───────────────────────────────────────────────────────────
// Company info patterns
// ───────────────────────────────────────────────────────────
const CIN_RE = /\b([LUFlu]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6})\b/;
const YEAR_END_RE = /(?:year\s+ended|as\s+at|as\s+on)\s+(31(?:st)?\s+(?:march|december|june|september)\s+\d{4}|march\s+31,?\s+\d{4}|\d{2}[\/\-.]\d{2}[\/\-.]\d{2,4})/i;
const COMPANY_NAME_RE = /^([A-Z][A-Z &.,'\-()]+(?:PRIVATE\s+)?LIMITED)/m;

// ───────────────────────────────────────────────────────────
// Extraction entry
// ───────────────────────────────────────────────────────────
/**
 * Extract company info + key financial metrics from the markdown.
 *
 * @param {string} markdown
 * @returns {{
 *   company: { name?, cin?, yearEnd? },
 *   keyMetrics: object,
 *   rounding: { unit, factorToLakhs },
 *   confidence: object   // field name -> 'high'|'medium'|'low'|null
 * }}
 */
export function extractMetricsFromText(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    return { company: {}, keyMetrics: {}, rounding: { unit: 'absolute', factorToLakhs: 0.00001 }, confidence: {} };
  }

  const rounding = detectRounding(markdown);
  const keyMetrics = {};
  const confidence = {};

  for (const [field, patterns] of Object.entries(FIELD_PATTERNS)) {
    for (const { re, conf } of patterns) {
      const m = markdown.match(re);
      if (m && m[1]) {
        const raw = parseIndianAmount(m[1]);
        if (raw != null) {
          // Normalise to lakhs based on the detected rounding unit
          keyMetrics[field] = +(raw * rounding.factorToLakhs).toFixed(4);
          confidence[field] = conf;
          break;
        }
      }
    }
  }

  // Synthesise totalBorrowings from long-term + short-term if direct match failed
  if (keyMetrics.totalBorrowingsLakhs == null) {
    const lt = markdown.match(new RegExp(`long[\\s-]*term\\s+borrowings[^\\n]*?${AMT}`, 'i'));
    const st = markdown.match(new RegExp(`(?:short[\\s-]*term\\s+borrowings|current\\s+borrowings)[^\\n]*?${AMT}`, 'i'));
    if (lt || st) {
      const a = lt && parseIndianAmount(lt[1]);
      const b = st && parseIndianAmount(st[1]);
      keyMetrics.totalBorrowingsLakhs = +((a || 0) * rounding.factorToLakhs + (b || 0) * rounding.factorToLakhs).toFixed(4);
      confidence.totalBorrowingsLakhs = 'medium';
    }
  }

  // Company info
  const cinMatch       = markdown.match(CIN_RE);
  const yearEndMatch   = markdown.match(YEAR_END_RE);
  const companyMatch   = markdown.match(COMPANY_NAME_RE);

  const company = {
    name:    companyMatch ? companyMatch[1].trim() : undefined,
    cin:     cinMatch     ? cinMatch[1].toUpperCase() : undefined,
    yearEnd: yearEndMatch ? yearEndMatch[1].trim() : undefined,
  };

  // Default booleans for compatibility with CARO applicability gate
  if (!('isHoldingOrSubOfPublicCo' in keyMetrics)) keyMetrics.isHoldingOrSubOfPublicCo = false;

  return { company, keyMetrics, rounding, confidence };
}

/**
 * Validate an Indian CIN format. Companies Act 2013 prescribes:
 *   L/U/F + 5 digits (industry code) + 2 letters (state code) +
 *   4 digits (year) + 3 letters (classification) + 6 digits (registration no.)
 */
export function isValidCIN(cin) {
  if (!cin || typeof cin !== 'string') return false;
  return /^[LUF]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/.test(cin.toUpperCase());
}

/**
 * Approximate equality check with absolute and relative tolerance.
 * Used by tie-out checks (face vs note).
 */
export function approxEqual(a, b, { absTol = 1, relTol = 0.01 } = {}) {
  if (a == null || b == null) return false;
  if (!isFinite(a) || !isFinite(b)) return false;
  const diff = Math.abs(a - b);
  if (diff <= absTol) return true;
  const denom = Math.max(Math.abs(a), Math.abs(b));
  return denom > 0 && diff / denom <= relTol;
}
