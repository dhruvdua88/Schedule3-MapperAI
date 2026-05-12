// ============ SCH3 RESPONSE SANITISER ============
//
// Post-response defence against LLM hallucination.
//
// The Schedule III prompt requires every issue to either (a) cite a
// rupee figure and verbatim evidence quote, or (b) explicitly state
// "Disclosure not located in the document" in the evidenceQuote field.
//
// Issues that have neither — i.e. an empty evidenceQuote that ALSO
// isn't the explicit "Disclosure not located" string — are almost
// always speculative, paraphrased, or invented. We drop them at the
// client side and log the count so reviewers can see what was filtered.
//
// We do NOT touch the company / keyMetrics objects, and we do not
// reorder issues beyond what the model already produced.

const NOT_LOCATED_PHRASES = [
  'disclosure not located',
  'not located in the document',
  'not located in document',
  'not present in the document',
  'not present in document',
  'not found in the document',
];

function looksLikeNotLocated(evidenceQuote) {
  if (!evidenceQuote || typeof evidenceQuote !== 'string') return false;
  const lower = evidenceQuote.toLowerCase().trim();
  return NOT_LOCATED_PHRASES.some((p) => lower.includes(p));
}

function hasRupeeFigure(text) {
  if (!text || typeof text !== 'string') return false;
  // Match common rupee patterns: "Rs ", "Rs.", "₹", "INR ", or "lakhs"/"crore" / numeric with comma separators.
  // We're permissive — false negatives are fine; we err on keeping issues.
  if (/(?:rs\.?\s*|₹\s*|inr\s*)\d/i.test(text)) return true;
  if (/\d[\d,]*(?:\.\d+)?\s*(lakhs?|cr|crore|cr\.|lakh)/i.test(text)) return true;
  return false;
}

/**
 * Filter out issues that lack evidence. Returns a new analysis object
 * with the filtered scheduleIIIIssues array; logs the drop count to console.
 *
 * @param {object} analysis - raw response from DeepSeek (parsed JSON).
 * @returns {object} sanitised analysis (same shape, filtered issues).
 */
export function sanitiseSch3Response(analysis) {
  if (!analysis || !Array.isArray(analysis.scheduleIIIIssues)) return analysis;

  const original = analysis.scheduleIIIIssues;
  const kept = [];
  const dropped = [];

  for (const iss of original) {
    if (!iss || typeof iss !== 'object') continue;

    const evidence    = iss.evidenceQuote;
    const observation = iss.observation;
    const hasEvidence = (typeof evidence === 'string' && evidence.trim().length > 0);
    const isNotLocated = looksLikeNotLocated(evidence);
    const observationHasFigure = hasRupeeFigure(observation);

    // Keep if:
    //   - evidenceQuote contains an actual quote (any non-empty string that isn't "not located"), OR
    //   - evidenceQuote explicitly says "Disclosure not located in the document", OR
    //   - observation cites a rupee figure (a quote-equivalent for arithmetic findings).
    if ((hasEvidence && !isNotLocated) || isNotLocated || observationHasFigure) {
      kept.push(iss);
    } else {
      dropped.push(iss);
    }
  }

  if (dropped.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[sch3-sanitise] dropped ${dropped.length} of ${original.length} issues without evidenceQuote or rupee figure:`,
      dropped.map((d) => ({ id: d.id, title: d.title, severity: d.severity })),
    );
  }

  return { ...analysis, scheduleIIIIssues: kept };
}
