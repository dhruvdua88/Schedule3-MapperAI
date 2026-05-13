// ============ RULE 11 STANDARD WORDING LIBRARY ============
//
// Scenario-tagged variants of the wording required under Rule 11 of the
// Companies (Audit and Auditors) Rules 2014. Picked from the ICAI
// Implementation Guides:
//   - Rule 11(e) & 11(f)  — Implementation Guide issued by AASB (Rev. 2022)
//   - Rule 11(g) audit trail — Implementation Guide (Revised 2024 Edition)
//
// Each clause exposes a list of { id, label, text } variants. The Audit
// Report tab shows these as a dropdown; selecting one fills the editable
// textarea. The user can then fine-tune for the specific engagement.
//
// Placeholders use [bracketed UPPER] tokens that the preparer must replace.
// IMPORTANT — these are illustrative wordings widely used across Indian
// audit practice and reflect current ICAI guidance, but the partner must
// confirm each variant fits the specific facts before signing.

// ────────────────────────────────────────────────────────────
// Rule 11(a) — Pending litigations
// ────────────────────────────────────────────────────────────
export const RULE_11A_VARIANTS = [
  {
    id:    '11a-no-pending',
    label: 'No pending litigations',
    text:  'The Company does not have any pending litigations which would impact its financial position.',
  },
  {
    id:    '11a-disclosed-with-note',
    label: 'Disclosed in notes (impact disclosed)',
    text:  'The Company has disclosed the impact of pending litigations on its financial position in its financial statements — refer Note [XX] to the financial statements.',
  },
  {
    id:    '11a-no-material-impact',
    label: 'Has litigations but no material impact',
    text:  'The Company has disclosed the pending litigations in Note [XX] to the financial statements; based on the Management\'s assessment, supported by legal opinions where applicable, no material adverse impact on the financial position is anticipated as at the balance sheet date.',
  },
  {
    id:    '11a-provision-made',
    label: 'Provision made where required',
    text:  'The Company has disclosed the impact of pending litigations on its financial position in Note [XX] to the financial statements and has made adequate provision, where required, in accordance with the applicable accounting standards.',
  },
];

// ────────────────────────────────────────────────────────────
// Rule 11(b) — Long-term contracts / Derivative contracts
// ────────────────────────────────────────────────────────────
export const RULE_11B_VARIANTS = [
  {
    id:    '11b-no-contracts',
    label: 'No long-term or derivative contracts',
    text:  'The Company did not have any long-term contracts including derivative contracts for which there were any material foreseeable losses.',
  },
  {
    id:    '11b-contracts-no-losses',
    label: 'Has contracts but no material foreseeable losses',
    text:  'The Company has made provision, as required under the applicable law or accounting standards, for material foreseeable losses, if any, on long-term contracts including derivative contracts; based on the Management\'s assessment, the Company has not entered into any long-term derivative contracts during the year.',
  },
  {
    id:    '11b-provision-made',
    label: 'Provision made for foreseeable losses',
    text:  'The Company has made adequate provision in the books of account, as required under the applicable law or accounting standards, for material foreseeable losses on long-term contracts including derivative contracts — refer Note [XX] to the financial statements.',
  },
];

// ────────────────────────────────────────────────────────────
// Rule 11(c) — Investor Education and Protection Fund (IEPF)
// ────────────────────────────────────────────────────────────
export const RULE_11C_VARIANTS = [
  {
    id:    '11c-no-amounts',
    label: 'No amounts required to be transferred',
    text:  'There has been no delay in transferring amounts, required to be transferred, to the Investor Education and Protection Fund by the Company.',
  },
  {
    id:    '11c-not-applicable',
    label: 'Not applicable (private company / no unpaid dividend etc.)',
    text:  'There were no amounts which were required to be transferred to the Investor Education and Protection Fund by the Company during the year.',
  },
  {
    id:    '11c-delay-identified',
    label: 'Delay identified',
    text:  'There has been a delay of [XX] days in transferring an amount of Rs. [XX] to the Investor Education and Protection Fund by the Company in respect of [unpaid dividend / matured deposits / matured debentures, as applicable].',
  },
];

// ────────────────────────────────────────────────────────────
// Rule 11(e) — Ultimate Beneficiary (three-part standard wording)
// Note: Per ICAI guidance, all three parts (a), (b) and (c) must appear
// together. This is rarely modified; only material exceptions are added.
// ────────────────────────────────────────────────────────────
export const RULE_11E_VARIANTS = [
  {
    id:    '11e-standard-three-part',
    label: 'Standard three-part (no exceptions)',
    text:
`(a) The Management has represented that, to the best of its knowledge and belief, no funds (which are material either individually or in the aggregate) have been advanced or loaned or invested (either from borrowed funds or share premium or any other sources or kind of funds) by the Company to or in any other person(s) or entity(ies), including foreign entities ("Intermediaries"), with the understanding, whether recorded in writing or otherwise, that the Intermediary shall, whether, directly or indirectly lend or invest in other persons or entities identified in any manner whatsoever by or on behalf of the Company ("Ultimate Beneficiaries") or provide any guarantee, security or the like on behalf of the Ultimate Beneficiaries;

(b) The Management has represented that, to the best of its knowledge and belief, no funds (which are material either individually or in the aggregate) have been received by the Company from any person(s) or entity(ies), including foreign entities ("Funding Parties"), with the understanding, whether recorded in writing or otherwise, that the Company shall, whether, directly or indirectly, lend or invest in other persons or entities identified in any manner whatsoever by or on behalf of the Funding Party ("Ultimate Beneficiaries") or provide any guarantee, security or the like on behalf of the Ultimate Beneficiaries;

(c) Based on the audit procedures performed that have been considered reasonable and appropriate in the circumstances, nothing has come to our notice that has caused us to believe that the representations under sub-clauses (a) and (b) above contain any material misstatement.`,
  },
  {
    id:    '11e-exception',
    label: 'Exception noted (modify part c)',
    text:
`(a) [Standard part (a) — see Standard variant.]

(b) [Standard part (b) — see Standard variant.]

(c) Based on the audit procedures performed that have been considered reasonable and appropriate in the circumstances, except for the matters described in [Note XX / paragraph XX above], nothing else has come to our notice that has caused us to believe that the representations under sub-clauses (a) and (b) above contain any material misstatement.`,
  },
];

// ────────────────────────────────────────────────────────────
// Rule 11(f) — Dividend declared/paid u/s 123
// ────────────────────────────────────────────────────────────
export const RULE_11F_VARIANTS = [
  {
    id:    '11f-no-dividend',
    label: 'No dividend declared or paid',
    text:  'The Company has not declared or paid any dividend during the year.',
  },
  {
    id:    '11f-final-dividend-paid',
    label: 'Final dividend paid (prior year, AGM approved)',
    text:  'The final dividend proposed in the previous year, declared and paid by the Company during the year, is in accordance with Section 123 of the Companies Act, 2013, as applicable.',
  },
  {
    id:    '11f-interim-dividend',
    label: 'Interim dividend declared and paid',
    text:  'The interim dividend declared and paid by the Company during the year and until the date of this report is in compliance with Section 123 of the Companies Act, 2013.',
  },
  {
    id:    '11f-final-and-interim',
    label: 'Both final (prior year) and interim',
    text:  'The final dividend proposed in the previous year, declared and paid by the Company during the year, is in accordance with Section 123 of the Companies Act, 2013, as applicable. The interim dividend declared and paid by the Company during the year is in compliance with Section 123 of the Companies Act, 2013.',
  },
  {
    id:    '11f-proposed-final',
    label: 'Final dividend proposed (subject to AGM)',
    text:  'The Board of Directors of the Company has proposed final dividend for the year which is subject to approval of the members at the ensuing Annual General Meeting. The proposed dividend is in accordance with Section 123 of the Companies Act, 2013, to the extent it applies to declaration of dividend.',
  },
];

// ────────────────────────────────────────────────────────────
// Rule 11(g) — Audit trail / Accounting software
// Per ICAI Implementation Guide (Revised 2024 Edition), illustrative
// wording covers multiple scenarios. The SOFTWARE token is replaced
// with the engagement's accounting software name.
// ────────────────────────────────────────────────────────────
export const RULE_11G_VARIANTS = [
  {
    id:    '11g-standard-throughout',
    label: 'Audit trail throughout the year, no tampering (clean)',
    text:
`Based on our examination, which included test checks, the Company has used [SOFTWARE] as its accounting software for maintaining its books of account, which has a feature of recording audit trail (edit log) facility and the same has operated throughout the year for all relevant transactions recorded in the software. Further, during the course of our audit, we did not come across any instance of the audit trail feature being tampered with. Additionally, the audit trail has been preserved by the Company as per the statutory requirements for record retention.`,
  },
  {
    id:    '11g-first-year-retention',
    label: 'Standard wording (preservation NA — first year of Rule 11(g))',
    text:
`Based on our examination, which included test checks, the Company has used [SOFTWARE] as its accounting software for maintaining its books of account, which has a feature of recording audit trail (edit log) facility and the same has operated throughout the year for all relevant transactions recorded in the software. Further, during the course of our audit, we did not come across any instance of the audit trail feature being tampered with. As proviso to Rule 3(1) of the Companies (Accounts) Rules, 2014 is applicable from 1 April 2023, reporting under Rule 11(g) of the Companies (Audit and Auditors) Rules, 2014 on preservation of audit trail as per statutory requirements for record retention is applicable for the financial year ended.`,
  },
  {
    id:    '11g-multiple-software',
    label: 'Multiple software (all with audit trail throughout)',
    text:
`Based on our examination, which included test checks, the Company has used [SOFTWARE_1] for maintaining its books of account and [SOFTWARE_2] for [payroll / fixed assets register / inventory / specify module], both of which have a feature of recording audit trail (edit log) facility and the same has operated throughout the year for all relevant transactions recorded in the respective software. Further, during the course of our audit, we did not come across any instance of the audit trail feature being tampered with in either software. Additionally, the audit trail has been preserved by the Company as per the statutory requirements for record retention.`,
  },
  {
    id:    '11g-audit-trail-at-application-only',
    label: 'Audit trail at application level only, not at database level',
    text:
`Based on our examination, which included test checks, the Company has used [SOFTWARE] as its accounting software for maintaining its books of account, which has a feature of recording audit trail (edit log) facility at the application level and the same has operated throughout the year for all relevant transactions recorded in the software. However, the audit trail feature at the database level has not been enabled and accordingly any direct data changes at the database level, if any, would not be logged. During the course of our audit, we did not come across any instance of the audit trail feature being tampered with at the application level. The audit trail has been preserved by the Company as per the statutory requirements for record retention.`,
  },
  {
    id:    '11g-not-enabled-part-of-year',
    label: 'Audit trail not enabled for part of the year (modified)',
    text:
`Based on our examination, which included test checks, the Company has used [SOFTWARE] as its accounting software for maintaining its books of account. The audit trail (edit log) feature was not enabled at the application level for the period from [DD MMM YYYY] to [DD MMM YYYY], during which time the said feature did not operate; the feature was enabled from [DD MMM YYYY] onwards and has operated thereafter throughout the year for all relevant transactions recorded in the software. Further, during the period for which the feature was enabled, we did not come across any instance of the audit trail feature being tampered with. The audit trail, for the period for which it was enabled, has been preserved by the Company as per the statutory requirements for record retention.`,
  },
  {
    id:    '11g-software-without-feature',
    label: 'Software has no audit-trail feature (adverse / modified)',
    text:
`Based on our examination, which included test checks, the Company has used [SOFTWARE] as its accounting software for maintaining its books of account. We were informed that the said software does not have a feature of recording audit trail (edit log) facility. Accordingly, the reporting on whether the audit trail feature has been operated throughout the year, on tampering of the audit trail, and on preservation of the audit trail, is not applicable / cannot be reported upon for the year ended.`,
  },
  {
    id:    '11g-payroll-no-trail',
    label: 'Main software has trail, payroll software does not',
    text:
`Based on our examination, which included test checks, the Company has used [SOFTWARE_MAIN] as its accounting software for maintaining its books of account, which has a feature of recording audit trail (edit log) facility and the same has operated throughout the year for all relevant transactions recorded in the software. The audit trail feature of [SOFTWARE_PAYROLL] used by the Company to maintain payroll records did not operate throughout the year. Further, during the course of our audit, we did not come across any instance of the audit trail feature being tampered with at the application level of [SOFTWARE_MAIN]. The audit trail has been preserved by the Company as per the statutory requirements for record retention.`,
  },
  {
    id:    '11g-service-organisation',
    label: 'Accounting maintained at service organisation (SOC 1 reliance)',
    text:
`Based on our examination, which included test checks and based on the Independent Service Auditor\'s Report on the description of controls, their design and operating effectiveness in accordance with SAE 3402, the Company has used [SOFTWARE], operated by [SERVICE_ORGANISATION], as its accounting software for maintaining its books of account, which has a feature of recording audit trail (edit log) facility and the same has operated throughout the year for all relevant transactions recorded in the software. Further, during the course of our audit, we did not come across any instance of the audit trail feature being tampered with. The audit trail has been preserved by [SERVICE_ORGANISATION] on behalf of the Company as per the statutory requirements for record retention.`,
  },
];

// Helper — flat lookup by clause key
export const RULE_11_WORDING = {
  a: RULE_11A_VARIANTS,
  b: RULE_11B_VARIANTS,
  c: RULE_11C_VARIANTS,
  e: RULE_11E_VARIANTS,
  f: RULE_11F_VARIANTS,
  g: RULE_11G_VARIANTS,
};
