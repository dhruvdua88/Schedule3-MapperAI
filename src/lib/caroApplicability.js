// ============ CARO 2020 — CLIENT-SIDE APPLICABILITY ============
//
// CARO 2020 Para 1(2)(iv) — a private limited company is EXEMPT from CARO
// only if ALL FOUR of the following hold (Rs in lakhs throughout):
//
//   (a) Not a holding or subsidiary of a public company.
//   (b) Paid-up capital + Reserves & Surplus ≤ Rs 100 lakhs.
//   (c) Total borrowings from banks/FIs ≤ Rs 100 lakhs at any point during the year.
//   (d) Total Revenue ≤ Rs 1,000 lakhs.
//
// Note (c) is "at any point during the year" — we only have year-end borrowings,
// so this is a best-effort check. The LLM CARO call (when fired) cross-checks
// against the actual notes.
//
// We compute this client-side so we can short-circuit the CARO LLM call
// entirely when the company is clearly exempt — saves a full API round-trip
// (~20-25s + tokens) on roughly half of small private-co engagements.

const CAP_RES_THRESHOLD_LAKHS   = 100;
const BORROWINGS_THRESHOLD_LAKHS = 100;
const REVENUE_THRESHOLD_LAKHS    = 1000;

const fmt = (n) => `Rs ${Number(n || 0).toFixed(2)} lakhs`;

/**
 * Compute CARO applicability from Schedule III keyMetrics.
 * Returns the same shape the LLM CARO call returns under .applicability,
 * so downstream code can treat both paths identically.
 *
 * @param {object} metrics - analysis.keyMetrics from the SCH3 response.
 * @returns {{applies: boolean, reasoning: string, thresholds: Array}}
 */
export function computeCaroApplicability(metrics = {}) {
  const capPlusRes  = (metrics.paidUpCapitalLakhs || 0) + (metrics.reservesLakhs || 0);
  const borrowings  =  metrics.totalBorrowingsLakhs || 0;
  const revenue     =  metrics.revenueLakhs        || 0;
  const isHoldOrSub = !!metrics.isHoldingOrSubOfPublicCo;

  const thresholds = [
    {
      test:   '(a) Not holding/subsidiary of a public company',
      result: isHoldOrSub ? 'Fail' : 'Pass',
      value:  isHoldOrSub ? 'Yes — disqualifies exemption' : 'No',
    },
    {
      test:   '(b) Paid-up capital + Reserves ≤ Rs 100 lakhs',
      result: capPlusRes <= CAP_RES_THRESHOLD_LAKHS ? 'Pass' : 'Fail',
      value:  fmt(capPlusRes),
    },
    {
      test:   '(c) Total borrowings ≤ Rs 100 lakhs (year-end proxy)',
      result: borrowings <= BORROWINGS_THRESHOLD_LAKHS ? 'Pass' : 'Fail',
      value:  fmt(borrowings),
    },
    {
      test:   '(d) Total revenue ≤ Rs 1,000 lakhs',
      result: revenue <= REVENUE_THRESHOLD_LAKHS ? 'Pass' : 'Fail',
      value:  fmt(revenue),
    },
  ];

  // Exemption requires ALL four conditions to pass.
  const allPass = thresholds.every((t) => t.result === 'Pass');
  const applies = !allPass;

  const failingTests = thresholds.filter((t) => t.result === 'Fail').map((t) => t.test);
  const reasoning = applies
    ? `CARO 2020 applies — the Company does not satisfy all four conditions of the Para 1(2)(iv) exemption. Failing: ${failingTests.join('; ')}.`
    : `CARO 2020 does not apply — the Company is a small private limited company satisfying all four conditions of the Para 1(2)(iv) exemption (Cap+Res ${fmt(capPlusRes)}, Borrowings ${fmt(borrowings)}, Revenue ${fmt(revenue)}, not holding/sub of a public co).`;

  return { applies, reasoning, thresholds };
}

/**
 * Build a "CARO does not apply" object client-side, in the same shape that
 * the CARO LLM call would return. Used to skip the API call entirely.
 */
export function synthesiseExemptCaroResult(metrics) {
  const applicability = computeCaroApplicability(metrics);
  return {
    applicability,
    clauses: [],     // no Annexure A when CARO doesn't apply
  };
}
