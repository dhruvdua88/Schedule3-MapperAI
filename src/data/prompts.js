// ============ AI PROMPTS ============
//
// SCH3_PROMPT  — 30-test Schedule III substantive review
// CARO_PROMPT  — lightweight CARO 2020 applicability + clause-flagging
//
// DO NOT EDIT these prompts. They are the canonical tests extracted verbatim
// from the source artifact and represent the business logic of this tool.
//
// Usage:
//   Schedule III: send as `userPrompt` after prepending the extracted markdown.
//   CARO:         call CARO_PROMPT(keyMetrics, companyName, isFirstYear, natureOfBusiness)
//                 and send the returned string as `userPrompt`.

export const SCH3_PROMPT = `Reviewer: senior CA. Standards: Schedule III Division I (AS, Companies Act 2013, as amended 24-Mar-2021). Analyse attached PDF.

Run the 30 tests below. For each test:
- If trigger doesn't apply → SKIP (don't output)
- If test PASSES → SKIP (don't output)
- If test FAILS → output ONE issue with the test ID

Return ONLY valid JSON (no markdown):
{
  "company": {"name","cin","yearEnd","incorporationDate","registeredAddress","natureOfBusiness","isFirstYear","auditFirm","auditFirmFRN"},
  "keyMetrics": {"revenueLakhs","profitBeforeTaxLakhs","profitAfterTaxLakhs","currentTaxLakhs","paidUpCapitalLakhs","reservesLakhs","totalBorrowingsLakhs","totalAssetsLakhs","tradeReceivablesLakhs","fixedAssetsLakhs","advanceTaxLakhs","isHoldingOrSubOfPublicCo"},
  "scheduleIIIIssues": [{"id":"T01","severity":"CRITICAL|HIGH|MEDIUM|LOW","category":"string","title":"string","observation":"specific finding with rupee figures, ≤35 words","implication":"≤18 words","recommendation":"≤18 words"}]
}

TESTS — flag ONLY failures, cite actual rupee figures:

[A. INTERNAL CONSISTENCY — CRITICAL]
T01 Tax-PBT alignment: PBT > 0 must have current tax > 0 (or MAT/exemption stated in notes).
T02 PPE absent despite operations: revenue > 0 OR employee cost > 0 → PPE > 0 OR ROU/leasehold improvements disclosed OR rationale.
T03 Cash flow tie-back: opening cash − closing cash = CFS net change.
T04 Advance tax mismatch: Advance tax on BS > 0 but no current tax in P&L (or vice versa) without reconciliation.
T05 Share issue expenses in P&L: Sec 35D / Sec 52 — these must be amortised or charged to share premium, NOT expensed in P&L.

[B. AMENDED SCH III — MANDATORY DISCLOSURES — HIGH]
T06 Title deeds of immovable property note (if any immovable property exists, Sch III II(WB)(viii)).
T07 Loans/advances to promoters/directors/KMP/related parties — separate disclosure (Sch III II(WB)(x)).
T08 Benami property proceedings disclosure (Sch III II(WB)(ix)).
T09 Wilful defaulter declaration (Sch III II(WB)(xi)).
T10 Relationship with struck-off companies (Sch III II(WB)(xii)).
T11 Registration of charges with ROC including pending satisfaction (Sch III II(WB)(xviii)).
T12 Compliance with No. of Layers per Sec 2(87)(b) (Sch III II(WB)(xiii)).
T13 Compliance with approved Scheme of Arrangement (Sch III II(WB)(xiv)).
T14 Utilisation of borrowed funds and share premium for stated purpose (Sch III II(WB)(xv)).
T15 Crypto / virtual currency dealings disclosure (Sch III II(WB)(xvii)).
T16 Undisclosed income surrendered in tax assessments (Sch III II(WB)(xvi)).
T17 Eleven Sch III ratios with prior-year + variance reasons if >25% (Sch III II(WB)(xix)).
T18 Trade Receivables ageing schedule with disputed/undisputed split.
T19 Trade Payables ageing schedule with MSME/Others split.
T20 Capital WIP ageing schedule (if CWIP > 0).
T21 Intangible Asset under Development ageing (if such asset > 0).

[C. AS COMPLIANCE — HIGH/MEDIUM]
T22 AS-3 Cash Flow Statement (mandatory unless Small Co/OPC).
T23 AS-15(R) actuarial disclosures for gratuity / leave encashment (assumptions + DBO recon).
T24 AS-18 Related Party — relationships, transactions, year-end balances.
T25 AS-22 Deferred tax — DTA recognition prudence assessed.
T26 AS-20 EPS — Basic + Diluted with face value, weighted avg, numerator reconciliation.
T27 AS-29 Contingent Liabilities & Commitments note.

[D. COMPANIES ACT — MEDIUM]
T28 MSMED Act 2006 Section 22 — six-clause disclosure (principal due, interest due, paid beyond 45 days, interest accrued, interest paid, interest remaining).
T29 Forex Earnings & Outgo per Sec 134(3)(m) read with Rule 8 Companies (Accounts) Rules 2014.
T30 Auditor's remuneration disaggregation (Statutory audit / Tax audit / Other services / OOP) and promoter shareholding "% Change during the year".

Output: order by severity CRITICAL → HIGH → MEDIUM → LOW. Use test ID as 'id'. Cite actual rupee figures. Be specific — NO generic statements.`;

// CARO_PROMPT is a function that embeds key metrics into the prompt.
// Returns the full user prompt string for the CARO analysis call.
export const CARO_PROMPT = (m, companyName, isFirstYear, natureOfBusiness) =>
  `You are a senior CA reviewer applying CARO 2020 to ${companyName} (nature: ${natureOfBusiness || 'unspecified'}).

Key inputs (Rs in lakhs):
- Paid-up capital + reserves: ${((m.paidUpCapitalLakhs || 0) + (m.reservesLakhs || 0)).toFixed(2)}
- Total borrowings: ${(m.totalBorrowingsLakhs || 0).toFixed(2)}
- Total revenue: ${(m.revenueLakhs || 0).toFixed(2)}
- Holding/sub of public co: ${m.isHoldingOrSubOfPublicCo}
- First year: ${isFirstYear ? 'Yes' : 'No'}
- PBT: ${(m.profitBeforeTaxLakhs || 0).toFixed(2)} | Current tax: ${(m.currentTaxLakhs || 0).toFixed(2)}
- Trade receivables: ${(m.tradeReceivablesLakhs || 0).toFixed(2)} | Fixed assets: ${(m.fixedAssetsLakhs || 0).toFixed(2)}

STEP 1 — Apply CARO 2020 paragraph 1(2)(iv): private company is exempt only if ALL of:
(a) Not holding/sub of public co  (b) Cap+Res ≤ Rs 100L  (c) Borrowings ≤ Rs 100L  (d) Revenue ≤ Rs 1,000L

STEP 2 — Default Annexure A wording is already pre-built in the tool. The defaults assume:
- 3(i): Standard PPE register, physical verification, title deeds in name, no revaluation, no benami
- 3(ii): No inventory; no WC limits >Rs 5 cr
- 3(iii): No investments / guarantees / loans granted
- 3(iv): No Sec 185/186 transactions
- 3(v): No public deposits
- 3(vi): Cost records not specified for Co's products/services
- 3(vii): Statutory dues regularly deposited; no disputed amounts
- 3(viii): No undisclosed income surrendered
- 3(ix): No default; not wilful defaulter; no term loans; no short-term used for long-term
- 3(x): No IPO/FPO; no preferential allotment / private placement
- 3(xi): No fraud; no ADT-4 filed; no whistle-blower complaints
- 3(xii): Not Nidhi
- 3(xiii): Related party txns in compliance with Sec 177/188
- 3(xiv): Internal audit not required under Sec 138
- 3(xv): No non-cash transactions with directors
- 3(xvi): Not NBFC/HFC/CIC; no group CICs
- 3(xvii): No cash losses in current or previous year
- 3(xviii): No resignation of auditor
- 3(xix): No material uncertainty (going concern intact)
- 3(xx): Sec 135 CSR not applicable
- 3(xxi): No CFS / no group CARO qualifications

For each of the 21 paragraphs, set "needsReview": true ONLY if a company-specific fact contradicts the default above. Provide a concise reviewNote citing actual figures (≤ 25 words). Otherwise needsReview: false and reviewNote: "".

Return ONLY valid JSON:
{
  "applicability": {
    "applies": boolean,
    "reasoning": "1-2 sentences",
    "thresholds": [{"test": "string", "result": "Pass|Fail|Unknown", "value": "string"}]
  },
  "clauseStatus": [
    {"paragraph": "3(i)", "needsReview": false, "reviewNote": ""},
    {"paragraph": "3(ii)", "needsReview": false, "reviewNote": ""}
    // ... return one entry for each of 3(i) through 3(xxi)
  ]
}

If CARO does not apply, return clauseStatus: []. Return ONLY the JSON object.`;
