// ============ AUDIT REPORT DEFAULTS & HTML BUILDERS ============
//
// SA 700 (Revised) compliant Independent Auditor's Report.
// Conditional logic:
//   - CARO 2020: from caro.applicability.applies
//   - IFCoFR (Sec 143(3)(i)): turnover-only test per practice convention
//       => exempt if revenueLakhs < 5000 (< Rs 50 cr)
//       NOTE: strict legal test under MCA GSR 583(E) requires BOTH
//             turnover < 50 cr AND borrowings < 25 cr (and !public sub).
//             Turnover-only test applied by user direction.
//   - Sec 197(16): always disapplied for private companies
//   - Rule 11(g) audit trail: required for FY 2023-24 onwards

import { todayISO } from '../lib/format.js';

export const DEFAULT_REPORT_FIELDS = {
  firmName:           'Dhruv Dua & Co.',
  firmFRN:            '028145N',
  partnerName:        'Dhruv Dua',
  partnerDesignation: 'Proprietor',
  membershipNo:       '531607',
  udin:               '',           // user fills at signing
  place:              'New Delhi',
  reportDate:         todayISO(),
  accountingSoftware: 'TallyPrime',
  // Rule 11 sub-clause defaults — clean (no adverse) per firm spec
  rule11a_litigation:      'The Company does not have any pending litigations which would impact its financial position.',
  rule11b_longTermContracts: 'The Company did not have any long-term contracts including derivative contracts for which there were any material foreseeable losses.',
  rule11c_iepf:            'There has been no delay in transferring amounts, required to be transferred, to the Investor Education and Protection Fund by the Company.',
  rule11f_dividend:        'The Company has not declared or paid any dividend during the year.',
  rule11e_text:            '',  // populated from RULE_11_WORDING.e[0].text by AuditReportTab on first render
  rule11g_text:            '',  // populated from RULE_11_WORDING.g[0].text with [SOFTWARE] substituted
  // Tracks which scenario variant the user picked per clause (for sticky dropdown selection)
  scenario:                { a: null, b: null, c: null, e: null, f: null, g: null },
  // Reviewer toggles — every Rule 11 item must be marked 'Reviewed' before generation
  reviewed: { a: false, b: false, c: false, e: false, f: false, g: false },
};
