// ============ RULE-ENGINE TEST CATALOGUE ============
//
// Data-driven catalogue of deterministic Schedule III checks. Each entry
// describes a single test the rule engine can run without calling DeepSeek.
//
// Shape:
//   id              — same test ID used by the AI prompt (T01..T69)
//                     so rule-engine and AI findings de-dup cleanly.
//   section         — A..F (matches the prompt sections)
//   severity        — CRITICAL | HIGH | MEDIUM | LOW
//   category        — Disclosure | Computation | Classification | Presentation | Policy
//   title           — short headline used on the issue card
//   patterns        — list of {re, weight} the engine searches for in the
//                     markdown. Any match counts towards `matchThreshold`.
//                     Negative weights deduct (used for affirmative
//                     "no benami proceedings" statements).
//   matchThreshold  — minimum cumulative weight to consider the disclosure
//                     present. If not met → FAIL.
//   observation     — string template; {q} is replaced with the highest-
//                     scoring matched phrase if any (else "Disclosure not
//                     located in the document.").
//   noteRef         — Schedule III citation
//   implication     — ≤ 25 words
//   recommendation  — ≤ 25 words
//
// Tests that require arithmetic (T01, T03, T06, BS-balance, tie-outs,
// opening=prior-closing) are NOT in this catalogue — they are coded as
// dedicated functions in ruleEngine.js because the data dependencies
// are too rich for a declarative spec.

export const RULE_DEFINITIONS = [
  // ════════════ SECTION B — 2021 AMENDMENT MANDATORY DISCLOSURES ════════════
  {
    id: 'T07', section: 'B', severity: 'HIGH', category: 'Disclosure',
    title: 'Title deeds of immovable property disclosure not detected',
    patterns: [
      { re: /title\s+deed(?:s)?(?:\s+of\s+immovable\s+property)?/i, weight: 2 },
      { re: /immovable\s+propert(?:y|ies)\s+(?:not\s+)?held\s+in\s+(?:the\s+)?name/i, weight: 3 },
      { re: /(?:para(?:graph)?\s+)?6\(L\)\(i\)/i, weight: 2 },
    ],
    matchThreshold: 2,
    observation: 'No reference to title deeds of immovable property or the affirmative "held in the name of the Company" statement located in the document.',
    noteRef: 'Sch III Div I Gen Instr Para 6(L)(i)',
    implication: 'Non-compliance with the 2021 MCA amendment on immovable-property disclosure.',
    recommendation: 'Add the tabular disclosure of title deeds — or an affirmative statement that all title deeds are in the Company\'s name.',
  },
  {
    id: 'T12', section: 'B', severity: 'HIGH', category: 'Disclosure',
    title: 'Benami property proceedings disclosure not detected',
    patterns: [
      { re: /benami(?:\s+(?:transactions?|property|act))?/i, weight: 3 },
      { re: /prohibition\s+of\s+benami/i, weight: 3 },
    ],
    matchThreshold: 3,
    observation: 'No Benami-property-proceedings disclosure located in the document. Sch III requires an affirmative statement even if no proceedings exist.',
    noteRef: 'Sch III Div I Gen Instr Para 6(L)(iv)',
    implication: 'Mandatory amended-Sch III disclosure missing.',
    recommendation: 'Add affirmative statement: "No proceedings have been initiated or are pending against the Company under the Benami Transactions (Prohibition) Act, 1988."',
  },
  {
    id: 'T14', section: 'B', severity: 'HIGH', category: 'Disclosure',
    title: 'Wilful defaulter disclosure not detected',
    patterns: [
      { re: /w[ie]l(?:l)?ful\s+default(?:er|ers|ed)?/i, weight: 3 },
    ],
    matchThreshold: 3,
    observation: 'No wilful defaulter declaration located in the document. Sch III requires an affirmative statement even where the Company has not been declared a wilful defaulter.',
    noteRef: 'Sch III Div I Gen Instr Para 6(L)(vi)',
    implication: 'Mandatory amended-Sch III disclosure missing.',
    recommendation: 'Add affirmative statement: "The Company has not been declared a wilful defaulter by any bank or financial institution or other lender."',
  },
  {
    id: 'T15', section: 'B', severity: 'HIGH', category: 'Disclosure',
    title: 'Relationship with struck-off companies disclosure not detected',
    patterns: [
      { re: /struck[\s-]+off\s+compan(?:y|ies)/i, weight: 3 },
      { re: /(?:section\s+)?248\b/i, weight: 1 },
    ],
    matchThreshold: 3,
    observation: 'No relationship-with-struck-off-companies disclosure located in the document. Sch III requires an affirmative statement.',
    noteRef: 'Sch III Div I Gen Instr Para 6(L)(vii)',
    implication: 'Mandatory amended-Sch III disclosure missing.',
    recommendation: 'Add the struck-off-companies disclosure — investments / payables / receivables — or affirmative "no such transactions" statement.',
  },
  {
    id: 'T17', section: 'B', severity: 'HIGH', category: 'Disclosure',
    title: 'Compliance with number of layers (Sec 2(87)) not detected',
    patterns: [
      { re: /(?:number\s+of\s+layers|no\.?\s+of\s+layers)/i, weight: 3 },
      { re: /section\s+2\(87\)/i, weight: 3 },
      { re: /companies\s+\(restriction\s+on\s+number\s+of\s+layers\)/i, weight: 3 },
    ],
    matchThreshold: 3,
    observation: 'No Number-of-Layers compliance disclosure located. Required where the Company has subsidiaries.',
    noteRef: 'Sch III Div I Gen Instr Para 6(L)(ix); Sec 2(87)',
    implication: 'Mandatory amended-Sch III disclosure missing.',
    recommendation: 'Add disclosure of compliance with the Companies (Restriction on Number of Layers) Rules 2017, or affirmative "Not applicable — the Company has no subsidiaries."',
  },
  {
    id: 'T19', section: 'B', severity: 'HIGH', category: 'Disclosure',
    title: 'Utilisation of borrowed funds — Intermediary / Ultimate Beneficiary disclosure not detected',
    patterns: [
      { re: /ultimate\s+beneficiar(?:y|ies)/i, weight: 3 },
      { re: /intermediar(?:y|ies)/i, weight: 2 },
      { re: /funding\s+part(?:y|ies)/i, weight: 2 },
    ],
    matchThreshold: 3,
    observation: 'No Intermediary / Ultimate Beneficiary disclosure located. Required even where no such transactions exist.',
    noteRef: 'Sch III Div I Gen Instr Para 6(L)(xii)–(xiii)',
    implication: 'Mandatory amended-Sch III disclosure missing.',
    recommendation: 'Add the two-pronged disclosure with affirmative statement that no such transactions occurred — both advanced/loaned/invested AND received.',
  },
  {
    id: 'T20', section: 'B', severity: 'HIGH', category: 'Disclosure',
    title: 'Crypto / virtual currency disclosure not detected',
    patterns: [
      { re: /crypto[\s-]*currenc(?:y|ies)/i, weight: 3 },
      { re: /virtual\s+currenc(?:y|ies)/i, weight: 3 },
    ],
    matchThreshold: 3,
    observation: 'No Crypto / Virtual Currency disclosure located. Sch III requires an affirmative statement even where no such transactions occurred.',
    noteRef: 'Sch III Div I Gen Instr Para 6(L)(xi)',
    implication: 'Mandatory amended-Sch III disclosure missing.',
    recommendation: 'Add affirmative statement: "The Company has not traded or invested in cryptocurrency or virtual currency during the year."',
  },
  {
    id: 'T21', section: 'B', severity: 'HIGH', category: 'Disclosure',
    title: 'Undisclosed income disclosure not detected',
    patterns: [
      { re: /undisclosed\s+income/i, weight: 3 },
      { re: /surrender(?:ed)?\s+as\s+income/i, weight: 2 },
      { re: /(?:section\s+)?(?:132|133A)\s+of\s+the\s+income[\s-]*tax\s+act/i, weight: 2 },
    ],
    matchThreshold: 3,
    observation: 'No undisclosed-income disclosure located. Sch III requires an affirmative statement.',
    noteRef: 'Sch III Div I Gen Instr Para 6(L)(x)',
    implication: 'Mandatory amended-Sch III disclosure missing.',
    recommendation: 'Add affirmative statement: "No transactions have been surrendered or disclosed as income during the year in tax assessments under the Income-tax Act, 1961."',
  },
  {
    id: 'T22', section: 'B', severity: 'HIGH', category: 'Disclosure',
    title: 'Eleven Schedule III ratios — full set not detected',
    // We score each ratio name and require ≥ 9 of 11 to consider the section present.
    patterns: [
      { re: /current\s+ratio/i, weight: 1 },
      { re: /debt[\s-]*equity\s+ratio/i, weight: 1 },
      { re: /debt\s+service\s+coverage(?:\s+ratio)?/i, weight: 1 },
      { re: /return\s+on\s+equity/i, weight: 1 },
      { re: /inventory\s+turnover/i, weight: 1 },
      { re: /trade\s+receivables?\s+turnover/i, weight: 1 },
      { re: /trade\s+payables?\s+turnover/i, weight: 1 },
      { re: /net\s+capital\s+turnover/i, weight: 1 },
      { re: /net\s+profit\s+ratio/i, weight: 1 },
      { re: /return\s+on\s+capital\s+employed/i, weight: 1 },
      { re: /return\s+on\s+investment/i, weight: 1 },
    ],
    matchThreshold: 9,
    observation: 'Fewer than nine of the eleven mandated Schedule III ratios were located in the document; the full set with prior-year comparatives is mandatory.',
    noteRef: 'Sch III Div I Gen Instr Para 6(L)(xvi)',
    implication: 'Mandatory amended-Sch III disclosure incomplete.',
    recommendation: 'Disclose all eleven ratios with prior-year comparatives AND explanation of variance > 25%.',
  },
  {
    id: 'T23', section: 'B', severity: 'HIGH', category: 'Disclosure',
    title: 'Trade Receivables ageing schedule not detected',
    patterns: [
      { re: /trade\s+receivables?\s+ageing/i, weight: 2 },
      { re: /less\s+than\s+6\s+months/i, weight: 1 },
      { re: /6\s+months\s*[-—]+\s*1\s+year/i, weight: 1 },
      { re: /1\s*[-—]+\s*2\s+years?/i, weight: 1 },
      { re: /2\s*[-—]+\s*3\s+years?/i, weight: 1 },
      { re: /more\s+than\s+3\s+years?/i, weight: 1 },
      { re: /undisputed.{0,40}considered\s+good/i, weight: 1 },
    ],
    matchThreshold: 5,
    observation: 'Trade Receivables ageing schedule with the mandated 5 buckets and disputed/undisputed × good/doubtful split was not located.',
    noteRef: 'Sch III Div I Gen Instr Para 6(L)(xviii)',
    implication: 'Mandatory amended-Sch III disclosure missing or incomplete.',
    recommendation: 'Insert the ageing schedule: < 6 months / 6m-1y / 1-2y / 2-3y / >3y, split Undisputed/Disputed × considered-good/doubtful.',
  },
  {
    id: 'T24', section: 'B', severity: 'HIGH', category: 'Disclosure',
    title: 'Trade Payables ageing schedule not detected',
    patterns: [
      { re: /trade\s+payables?\s+ageing/i, weight: 2 },
      { re: /msme/i, weight: 1 },
      { re: /less\s+than\s+1\s+year/i, weight: 1 },
      { re: /1\s*[-—]+\s*2\s+years?/i, weight: 1 },
      { re: /2\s*[-—]+\s*3\s+years?/i, weight: 1 },
      { re: /more\s+than\s+3\s+years?/i, weight: 1 },
      { re: /disputed\s+dues/i, weight: 1 },
    ],
    matchThreshold: 5,
    observation: 'Trade Payables ageing schedule with MSME / Others split and the four buckets was not located in the document.',
    noteRef: 'Sch III Div I Gen Instr Para 6(L)(xix)',
    implication: 'Mandatory amended-Sch III disclosure missing or incomplete.',
    recommendation: 'Insert ageing schedule: <1y / 1-2y / 2-3y / >3y split into MSME / Others / Disputed MSME / Disputed Others.',
  },

  // ════════════ SECTION C — OTHER MANDATORY SCH III PRESENTATION ════════════
  {
    id: 'T28', section: 'C', severity: 'HIGH', category: 'Presentation',
    title: 'Reserves & Surplus break-up not detected',
    patterns: [
      { re: /securities\s+premium/i, weight: 1 },
      { re: /capital\s+reserve(?!\s*redemption)/i, weight: 1 },
      { re: /capital\s+redemption\s+reserve/i, weight: 1 },
      { re: /debenture\s+redemption\s+reserve/i, weight: 1 },
      { re: /revaluation\s+reserve/i, weight: 1 },
      { re: /general\s+reserve/i, weight: 1 },
      { re: /(?:surplus|balance)\s+in\s+(?:the\s+)?(?:statement\s+of\s+)?profit\s+(?:and|&)\s+loss/i, weight: 2 },
    ],
    matchThreshold: 3,
    observation: 'Reserves & Surplus break-up into the prescribed reserve categories was not detected. Schedule III mandates separate lines for each reserve type plus Surplus in Statement of P&L.',
    noteRef: 'Sch III Div I Part I — Reserves and Surplus',
    implication: 'Reserves not bifurcated as required.',
    recommendation: 'Disclose each reserve on a separate line: Capital Reserve, Capital Redemption Reserve, Securities Premium, Debenture Redemption Reserve, Revaluation Reserve, Other Reserves, Surplus in P&L.',
  },
  {
    id: 'T32', section: 'C', severity: 'LOW', category: 'Presentation',
    title: 'Rounding-off policy not detected',
    patterns: [
      { re: /(?:rs?\.?|rupees?|inr|₹|amount(?:s)?)\s+in\s+(?:lakhs?|crores?|millions?|thousands?|hundreds?)/i, weight: 3 },
      { re: /(?:figures?|amounts?)\s+(?:are\s+)?rounded\s+off/i, weight: 3 },
    ],
    matchThreshold: 3,
    observation: 'Rounding-off policy statement was not detected. Schedule III General Instructions Para 4 requires a stated rounding policy consistent across BS, P&L, CFS and Notes.',
    noteRef: 'Sch III Div I Gen Instr Para 4',
    implication: 'Schedule III rounding compliance cannot be confirmed.',
    recommendation: 'State the rounding-off policy explicitly (e.g., "All amounts are in Rs lakhs unless otherwise stated").',
  },

  // ════════════ SECTION E — COMPANIES ACT / OTHER STATUTES ════════════
  {
    id: 'T55', section: 'E', severity: 'MEDIUM', category: 'Disclosure',
    title: 'MSMED Act Sec 22 six-clause disclosure not detected',
    patterns: [
      { re: /msmed\s+act/i, weight: 2 },
      { re: /micro,?\s+small\s+and\s+medium\s+enterprises/i, weight: 1 },
      { re: /section\s+22\s+of\s+(?:the\s+)?(?:msmed|micro)/i, weight: 1 },
      { re: /principal\s+amount.{0,30}(?:due|unpaid).{0,50}suppliers?/i, weight: 1 },
      { re: /interest\s+due.{0,30}(?:thereon|remaining\s+unpaid)/i, weight: 1 },
      { re: /interest\s+(?:accrued|paid)\s+(?:and\s+remaining\s+unpaid|under\s+section\s+16)/i, weight: 1 },
      { re: /appointed\s+day/i, weight: 1 },
    ],
    matchThreshold: 4,
    observation: 'MSMED Act 2006 Section 22 six-clause disclosure does not appear complete in the document. The six mandated clauses on principal due / interest due / interest paid / interest accrued etc. must all be disclosed.',
    noteRef: 'Sec 22 of MSMED Act 2006',
    implication: 'Statutory disclosure incomplete; carries an audit reporting consequence.',
    recommendation: 'Include all six clauses verbatim, even where the amounts are nil.',
  },
  {
    id: 'T59', section: 'E', severity: 'MEDIUM', category: 'Disclosure',
    title: 'Note 1 Corporate Information not detected',
    patterns: [
      { re: /(?:^|\n)\s*(?:note\s*1\b|1\.\s*corporate\s+information)/i, weight: 3 },
      { re: /registered\s+office/i, weight: 1 },
      { re: /nature\s+of\s+business/i, weight: 1 },
      { re: /\b[LUF]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}\b/, weight: 1 },
    ],
    matchThreshold: 3,
    observation: 'Note 1 — Corporate Information was not detected, OR core elements (registered office / nature of business / CIN) are missing.',
    noteRef: 'Sch III Div I — Notes presentation',
    implication: 'Reader cannot identify the entity context.',
    recommendation: 'Insert Note 1 with registered office address, nature of business, and CIN.',
  },
  {
    id: 'T60', section: 'E', severity: 'MEDIUM', category: 'Policy',
    title: 'Note 2 Significant Accounting Policies — key sub-policies not detected',
    // Score against expected sub-policy keywords; require ≥ 6 of 10 to consider present.
    patterns: [
      { re: /basis\s+of\s+preparation/i, weight: 1 },
      { re: /revenue\s+recognition/i, weight: 1 },
      { re: /depreciation/i, weight: 1 },
      { re: /foreign\s+currency/i, weight: 1 },
      { re: /employee\s+benefits?/i, weight: 1 },
      { re: /(?:taxation|taxes\s+on\s+income|income\s+tax)/i, weight: 1 },
      { re: /provisions?\s+and\s+contingent/i, weight: 1 },
      { re: /(?:earnings\s+per\s+share|eps)/i, weight: 1 },
      { re: /inventor(?:y|ies)\s+(?:valuation|policy)/i, weight: 1 },
      { re: /(?:borrowing\s+costs?|leases?)/i, weight: 1 },
    ],
    matchThreshold: 6,
    observation: 'Note 2 — Significant Accounting Policies appears to be missing one or more of the key sub-policies (basis of preparation, revenue recognition, depreciation, foreign currency, employee benefits, taxation, provisions, EPS, inventories, borrowing costs / leases).',
    noteRef: 'Sch III Div I — Notes presentation; AS-1',
    implication: 'Reader cannot understand the accounting basis.',
    recommendation: 'Expand Note 2 to cover all relevant sub-policies for the engagement.',
  },
];

/**
 * Run all keyword-based rule definitions against the markdown.
 * Returns an array of issue objects (DeepSeek-compatible shape) plus
 * the matched evidence quote for the source-anchor modal.
 *
 * @param {string} markdown
 * @returns {Array<{id, section, severity, category, title, observation, evidenceQuote, noteRef, implication, recommendation, source: 'rule'}>}
 */
export function runKeywordRules(markdown) {
  if (!markdown) return [];
  const issues = [];

  for (const def of RULE_DEFINITIONS) {
    let score = 0;
    let bestMatchPhrase = null;
    let bestMatchWeight = -Infinity;

    for (const { re, weight } of def.patterns) {
      const m = markdown.match(re);
      if (m) {
        score += weight;
        if (weight > bestMatchWeight) {
          bestMatchWeight = weight;
          bestMatchPhrase = m[0];
        }
      }
    }

    if (score < def.matchThreshold) {
      // FAIL — disclosure not detected or incomplete
      issues.push({
        id:             def.id,
        section:        def.section,
        severity:       def.severity,
        category:       def.category,
        title:          def.title,
        observation:    def.observation,
        evidenceQuote:  bestMatchPhrase
          ? `Partial match: "${bestMatchPhrase.slice(0, 80)}…" (score ${score}/${def.matchThreshold})`
          : 'Disclosure not located in the document.',
        noteRef:        def.noteRef,
        implication:    def.implication,
        recommendation: def.recommendation,
        source:         'rule',
      });
    }
  }

  return issues;
}
