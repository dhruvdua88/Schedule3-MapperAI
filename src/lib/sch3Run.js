// ============ SCH3 SECTIONED RUNNER — latency optimisation ============
//
// PROBLEM
//   The Deep AI Review sends ONE giant prompt (full FS markdown + all 73 tests,
//   up to 60 issues) in a single DeepSeek call. Token generation inside one
//   request is sequential, so a dense document crawls — 60–120 s is common.
//
// APPROACH (no behaviour change to the audit logic, no prompt-text edits)
//   1. PARALLELISE BY SECTION. The canonical SCH3_PROMPT is split at runtime
//      into its six test sections (A–F). Each section runs as its OWN DeepSeek
//      call, all fired concurrently. Wall-clock ≈ the slowest single section,
//      not the sum — usually a 3–5× speedup because each call also generates
//      far fewer tokens.
//   2. PREFIX CACHING. DeepSeek auto-caches identical leading tokens. We put
//      (a) the shared preamble in the SYSTEM message — identical across all six
//      calls AND across runs, and (b) the document FIRST in the user message —
//      identical across the six calls of one run. After the first call warms
//      the cache, the other five hit the cached [system + document] prefix.
//   3. INPUT TRIM. Redundant blank lines / trailing spaces are collapsed before
//      the markdown is sent (smaller input = faster first token + lower cost).
//
//   We deliberately DO NOT enable streaming here — DeepSeek's
//   response_format:json_object path has been observed to return empty buffers
//   when streamed (see CLAUDE.md). All calls stay non-streaming + temp 0.
//
// The merged return is byte-compatible with the old single-call shape
//   { company, keyMetrics, scheduleIIIIssues }
// so sanitiseSch3Response() + mergeAnalyses() downstream are unchanged.

import { SCH3_PROMPT } from '../data/prompts.js';
import { callDeepSeek } from './deepseek.js';

// ───────────────────────────────────────────────────────────
// Split the canonical prompt into { preamble, sections[], footer } ONCE.
// We slice the existing string rather than editing prompts.js, so the canonical
// prompt text remains the single source of truth. If the section banners ever
// change, the splitter degrades gracefully to a single combined "section".
// ───────────────────────────────────────────────────────────
function splitSch3Prompt(prompt) {
  const FOOTER_MARK = 'FINAL SELF-REVIEW PASS';
  const footerIdx = prompt.indexOf(FOOTER_MARK);
  const footer = footerIdx >= 0 ? prompt.slice(footerIdx) : '';
  const body   = footerIdx >= 0 ? prompt.slice(0, footerIdx) : prompt;

  // Locate each "SECTION X —" banner.
  const re = /SECTION ([A-F]) —/g;
  const marks = [];
  let m;
  while ((m = re.exec(body)) !== null) marks.push({ key: m[1], idx: m.index });

  if (marks.length === 0) {
    // Fallback — couldn't parse sections; run the whole thing as one block.
    return { preamble: '', sections: [{ key: 'ALL', text: body }], footer };
  }

  const preamble = body.slice(0, marks[0].idx).trimEnd();
  const sections = marks.map((mk, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].idx : body.length;
    return { key: mk.key, text: body.slice(mk.idx, end).trim() };
  });
  return { preamble, sections, footer: footer.trim() };
}

// Compute once at module load.
const SPLIT = splitSch3Prompt(SCH3_PROMPT);

// ───────────────────────────────────────────────────────────
// Trim the document before sending: collapse 3+ blank lines to one, strip
// trailing whitespace. Purely cosmetic to the model, but trims input tokens.
// ───────────────────────────────────────────────────────────
function compactMarkdown(md) {
  if (!md) return '';
  return md
    .replace(/[ \t]+\n/g, '\n')   // trailing spaces
    .replace(/\n{3,}/g, '\n\n')   // runs of blank lines
    .trim();
}

// Only the first section call carries the full company/keyMetrics schema; the
// rest are told to leave those empty so they spend their output budget on
// issues. (Rule-engine metrics are authoritative anyway via mergeAnalyses.)
const METRICS_SUPPRESSION =
  '\n\n[THIS CALL] Return "company": {} and "keyMetrics": {} as empty objects. ' +
  'Populate ONLY "scheduleIIIIssues" for the tests in the section above.';

/**
 * Run the Schedule III review as parallel per-section DeepSeek calls and merge.
 *
 * @param {object}   opts
 * @param {string}   opts.apiKey
 * @param {string}   opts.model
 * @param {string}   opts.systemRole   - the senior-CA system instruction string
 * @param {string}   opts.markdown     - extracted FS markdown
 * @param {AbortSignal} [opts.signal]
 * @param {function} [opts.onUsage]    - ({input_tokens, output_tokens}) running totals
 * @param {function} [opts.onSectionDone] - (key) fired as each section resolves
 * @param {number}   [opts.timeoutMs]  - per-section timeout (default 240_000)
 * @returns {Promise<{company, keyMetrics, scheduleIIIIssues}>}
 */
export async function runSch3Sectioned({
  apiKey, model, systemRole, markdown, signal, onUsage, onSectionDone,
  timeoutMs = 240_000,
}) {
  const doc = compactMarkdown(markdown);

  // System message = role + shared preamble. IDENTICAL across all sections and
  // across runs → maximally cache-friendly.
  const systemPrompt = `${systemRole}\n\n${SPLIT.preamble}`;

  // Aggregate token usage across the concurrent calls.
  const usageTotal = { input_tokens: 0, output_tokens: 0 };
  const addUsage = (u) => {
    if (!u) return;
    usageTotal.input_tokens  += u.input_tokens  || 0;
    usageTotal.output_tokens += u.output_tokens || 0;
    onUsage?.({ ...usageTotal });
  };

  const calls = SPLIT.sections.map((section, i) => {
    const wantsMetrics = i === 0;          // first section returns company+metrics
    // Document FIRST (shared prefix → cache hit), then this section's tests,
    // then the self-review footer, then the per-call metrics directive.
    const userPrompt =
      `${doc}\n\n${section.text}\n\n${SPLIT.footer}` +
      (wantsMetrics ? '' : METRICS_SUPPRESSION);

    return callDeepSeek({
      apiKey,
      model,
      systemPrompt,
      userPrompt,
      signal,
      temperature: 0.0,
      top_p:       0.1,
      timeoutMs,
      onUsage:     addUsage,
    })
      .then((res) => { onSectionDone?.(section.key); return res; })
      .catch((err) => {
        // A failed section must not sink the whole review. Auth/abort are fatal
        // and re-thrown so the orchestrator can surface them; others degrade to
        // "this section produced nothing".
        if (err?.name === 'AuthError' || err?.name === 'AbortError') throw err;
        // eslint-disable-next-line no-console
        console.warn(`[sch3] section ${section.key} failed: ${err?.message || err}`);
        return null;
      });
  });

  const results = await Promise.all(calls);

  // ── Merge ──
  let company = {};
  let keyMetrics = {};
  const issues = [];
  const seenIds = new Set();

  for (const res of results) {
    if (!res) continue;
    if (res.company && typeof res.company === 'object' && !company.name) {
      company = res.company;
    }
    if (res.keyMetrics && typeof res.keyMetrics === 'object' && Object.keys(keyMetrics).length === 0) {
      keyMetrics = res.keyMetrics;
    }
    const arr = Array.isArray(res.scheduleIIIIssues) ? res.scheduleIIIIssues : [];
    for (const iss of arr) {
      // De-dup by test ID across sections; first occurrence wins. Issues without
      // an id (rare) are kept as-is.
      const key = iss?.id;
      if (key && seenIds.has(key)) continue;
      if (key) seenIds.add(key);
      issues.push(iss);
    }
  }

  // Preserve the prompt's severity ordering: CRITICAL → HIGH → MEDIUM → LOW.
  const SEV_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  issues.sort((a, b) => (SEV_RANK[a?.severity] ?? 9) - (SEV_RANK[b?.severity] ?? 9));

  return { company, keyMetrics, scheduleIIIIssues: issues };
}

// Exposed for unit testing the splitter.
export const __SPLIT = SPLIT;
