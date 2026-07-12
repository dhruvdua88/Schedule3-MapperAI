// ============ Grouping Mapper — deterministic unit tests ============
//
// Pure, offline tests for the deterministic layers of the Grouping Mapper
// (no DeepSeek / network). Run with `npm test`. These lock the behaviour built
// up over many iterations so it can't silently regress — every rule here maps to
// a real presentation/classification decision on the balance sheet face.
//
// Usage: node test/grouping.test.mjs   (exit code 1 on any failure)

import assert from 'node:assert/strict';
import {
  formatSubNote, canonicalizeSubNotes, applyDeterministicSubNotes,
  applyDeterministicNotes, flagSignAnomalies, flagTallyReview, flagImmaterialSubNotes,
  flagProvisionPlacement, stripRedundantSubNotes, flagYoyReclassification,
  parsePasted, reviewFlagsText,
} from '../src/lib/groupingMap.js';
import { canonicalFace, canonicalNote, NOTES_BY_FACE } from '../src/data/sch3Vocab.js';

let passed = 0;
const cases = [];
function t(name, fn) { cases.push([name, fn]); }
const row = (o) => ({ face: '', note: '', subNote: '', ledger: '', amount: null, sysPrimary: '', flags: [], ...o });

// ---- formatSubNote --------------------------------------------------------
t('formatSubNote: acronyms upper, small words lower', () => {
  assert.equal(formatSubNote('tds payable'), 'TDS Payable');
  assert.equal(formatSubNote('gst input credit'), 'GST Input Credit');
  assert.equal(formatSubNote('advances to vendors'), 'Advances to Vendors');
  assert.equal(formatSubNote('pf & esi payable'), 'PF & ESI Payable');
});
t('formatSubNote: keeps L&T / A/c tight, spaces real & and /', () => {
  assert.equal(formatSubNote('L&T Finance Limited'), 'L&T Finance Ltd');
  assert.equal(formatSubNote('Repairs&Maintenance'), 'Repairs & Maintenance');
  assert.equal(formatSubNote('TDS/TCS Payable'), 'TDS / TCS Payable');
});
t('formatSubNote: strips A/c tail, keeps digits', () => {
  assert.equal(formatSubNote('Bajaj Finance Limited A/c'), 'Bajaj Finance Ltd');
  assert.equal(formatSubNote('Salary  Payable Ledger'), 'Salary Payable');
  assert.equal(formatSubNote('Input CGST 2.5%'), 'Input CGST 2.5%');
});
t('formatSubNote: cases across punctuation (initials, parens, hyphens)', () => {
  assert.equal(formatSubNote('Advance S.santhanamuthukrishnan'), 'Advance S. Santhanamuthukrishnan');
  assert.equal(formatSubNote('Consumables (gst)'), 'Consumables (GST)');
  assert.equal(formatSubNote('Adopt Net Tech Pvt Ltd(advance)'), 'Adopt Net Tech Pvt Ltd(Advance)');
});
t('formatSubNote: idempotent + consecutive initials in one pass', () => {
  assert.equal(formatSubNote('S.K.Verma & Co'), 'S. K. Verma & Co');
  assert.equal(formatSubNote('A.B.C.Traders'), 'A. B. C. Traders');
  for (const c of ['tds payable', 'S.K.Verma', '- Delhi Electricity', 'L&T Finance Limited',
    'Bajaj Finance Limited A/c', 'Consumables (gst)', 'Foo -- Bar', 'Input CGST 2.5%']) {
    assert.equal(formatSubNote(formatSubNote(c)), formatSubNote(c), `idempotent: ${c}`);
  }
});
t('formatSubNote: strips leading/trailing separators, collapses doubled', () => {
  assert.equal(formatSubNote('- Delhi Electricity'), 'Delhi Electricity');
  assert.equal(formatSubNote('Rent Noida -'), 'Rent Noida');
  assert.equal(formatSubNote('Name , '), 'Name');
  assert.equal(formatSubNote('& Something'), 'Something');
  assert.equal(formatSubNote('Foo -- Bar'), 'Foo - Bar');
});
t('formatSubNote: consistent company suffixes', () => {
  assert.equal(formatSubNote('Bajaj Finance Limited'), 'Bajaj Finance Ltd');
  assert.equal(formatSubNote('Citius Communications Private Limited'), 'Citius Communications Pvt Ltd');
  assert.equal(formatSubNote('Adopt Net Tech Pvt. Ltd.'), 'Adopt Net Tech Pvt Ltd');
  assert.equal(formatSubNote('Virtual Door IT Services LLP'), 'Virtual Door IT Services LLP');
});

// ---- canonicalizeSubNotes (token-set within a bucket) --------------------
t('canonicalizeSubNotes: merges word-order/status variants, not distinct taxes', () => {
  const rows = [
    row({ face: 'Other current assets', note: 'Others', subNote: 'Input CGST Credit' }),
    row({ face: 'Other current assets', note: 'Others', subNote: 'CGST Input Credit' }),
    row({ face: 'Other current assets', note: 'Others', subNote: 'IGST Input Credit' }),
    row({ face: 'Other current liabilities', note: 'Other payables', subNote: 'Credit Card Dues' }),
    row({ face: 'Other current liabilities', note: 'Other payables', subNote: 'Credit Card Payable' }),
  ];
  canonicalizeSubNotes(rows);
  assert.equal(rows[0].subNote, rows[1].subNote, 'word-order variants unify');
  assert.notEqual(rows[0].subNote, rows[2].subNote, 'CGST vs IGST stay distinct');
  assert.equal(rows[3].subNote, rows[4].subNote, 'Dues == Payable unify');
});

// ---- applyDeterministicSubNotes (statutory dictionary) ------------------
t('applyDeterministicSubNotes: GST-input collapse, PF unify, expense untouched', () => {
  const rows = [
    row({ ledger: 'CGST Input', face: 'Other current assets', subNote: 'CGST Input Receivable' }),
    row({ ledger: 'Input CGST 2.5%', face: 'Other current assets', subNote: 'Input CGST 2.5%' }),
    row({ ledger: 'Provident Fund Payable(Employee)', face: 'Other current liabilities', subNote: 'Provident Fund Payable' }),
    row({ ledger: 'Admin Charges On PF', face: 'Employee benefit expenses', subNote: 'Admin Charges on PF' }),
    row({ ledger: 'GST Cash Balance', face: 'Other current assets', subNote: 'GST Cash Balance' }),
  ];
  applyDeterministicSubNotes(rows);
  assert.equal(rows[0].subNote, 'GST Input Credit');
  assert.equal(rows[1].subNote, 'GST Input Credit');
  assert.equal(rows[2].subNote, 'PF Payable');
  assert.equal(rows[3].subNote, 'Admin Charges on PF', 'expense face untouched');
  assert.equal(rows[4].subNote, 'GST Cash Balance', 'non-input GST untouched');
});

// ---- applyDeterministicNotes (secured bank OD) --------------------------
t('applyDeterministicNotes: bank OD/CC -> secured, credit card untouched', () => {
  const rows = [
    row({ ledger: 'ICICI Bank Ltd OD-3967', face: 'Short term borrowings', note: 'Unsecured Loans repayable on demand from banks' }),
    row({ ledger: 'HDFC Cash Credit A/c', face: 'Short term borrowings', note: 'Unsecured Other loans and advances' }),
    row({ ledger: 'Axis Bank Credit Card', face: 'Other current liabilities', note: 'Other payables' }),
  ];
  const n = applyDeterministicNotes(rows);
  assert.equal(n, 2);
  assert.equal(rows[0].note, 'Secured Loans repayable on demand from banks');
  assert.equal(rows[1].note, 'Secured Loans repayable on demand from banks');
  assert.equal(rows[2].note, 'Other payables', 'credit card (wrong face) untouched');
});
t('applyDeterministicNotes: imprest -> Loans and advances to employees', () => {
  const rows = [
    row({ ledger: 'Imprest Sachin Jaiswal', face: 'Short term loans and advances', note: 'Others' }),
    row({ ledger: 'VINOD NEGI (IMPREST)', face: 'Short term loans and advances', note: 'Loans and advances to employees' }),
    row({ ledger: 'Advance-United India Insurance Co.', face: 'Short term loans and advances', note: 'Advances to suppliers' }),
  ];
  applyDeterministicNotes(rows);
  assert.equal(rows[0].note, 'Loans and advances to employees', 'imprest reclassified from Others');
  assert.equal(rows[1].note, 'Loans and advances to employees', 'already correct');
  assert.equal(rows[2].note, 'Advances to suppliers', 'vendor advance untouched');
});
t('applyDeterministicNotes: electricity -> Power and fuel, electrical parts untouched', () => {
  const rows = [
    row({ ledger: 'Electricity & water Expenses', face: 'Other expenses', note: 'Indirect expenses' }),
    row({ ledger: 'Delhi Electricity', face: 'Other expenses', note: 'Power and fuel' }),
    row({ ledger: 'Electrical Parts & Electronics', face: 'Other expenses', note: 'Repairs to machinery' }),
  ];
  applyDeterministicNotes(rows);
  assert.equal(rows[0].note, 'Power and fuel', 'electricity reclassified');
  assert.equal(rows[1].note, 'Power and fuel', 'already correct, unchanged');
  assert.equal(rows[2].note, 'Repairs to machinery', 'electrical PARTS excluded');
});

// ---- flagSignAnomalies --------------------------------------------------
t('flagSignAnomalies: asset+credit flagged, liability+credit clean, contra skipped', () => {
  const rows = [
    row({ ledger: 'Advance X', face: 'Short term loans and advances', amount: -50000 }), // asset + credit -> flag
    row({ ledger: 'TDS Payable', face: 'Other current liabilities', amount: -3600 }),      // liability + credit -> clean
    row({ ledger: 'Provision for doubtful debts', face: 'Trade receivables', amount: -9000 }), // contra -> skip
    row({ ledger: 'Petty amount', face: 'Trade receivables', amount: -200 }),             // immaterial -> skip
  ];
  const n = flagSignAnomalies(rows);
  assert.equal(n, 1);
  assert.match(rows[0].flags.join(), /balance unusual/);
  assert.equal(rows[1].flags.length, 0);
  assert.equal(rows[2].flags.length, 0);
  assert.equal(rows[3].flags.length, 0);
});

// ---- flagTallyReview ----------------------------------------------------
t('flagTallyReview: contradiction flagged, agreement clean', () => {
  const rows = [
    row({ ledger: 'X', sysPrimary: 'Fixed Assets', face: 'Other current assets' }), // contradiction
    row({ ledger: 'Y', sysPrimary: 'Sundry Debtors', face: 'Trade receivables' }),  // agreement
    row({ ledger: 'Z', sysPrimary: 'Sundry Creditors', face: 'Other current liabilities' }), // omitted group -> no flag
  ];
  const n = flagTallyReview(rows);
  assert.equal(n, 1);
  assert.match(rows[0].flags.join(), /Fixed Assets/);
  assert.equal(rows[1].flags.length, 0);
  assert.equal(rows[2].flags.length, 0);
});

// ---- stripRedundantSubNotes ---------------------------------------------
t('stripRedundantSubNotes: sub-note == note/face blanked; distinct kept', () => {
  const rows = [
    row({ face: 'Other expenses', note: 'Professional fees', subNote: 'Professional Fees' }), // == note -> blank
    row({ face: 'Other current liabilities', note: 'Other payables', subNote: 'Other Current Liabilities' }), // == face -> blank
    row({ face: 'Other current liabilities', note: 'Statutory dues', subNote: 'TDS Payable' }), // distinct -> keep
  ];
  const n = stripRedundantSubNotes(rows);
  assert.equal(n, 2);
  assert.equal(rows[0].subNote, '');
  assert.equal(rows[1].subNote, '');
  assert.equal(rows[2].subNote, 'TDS Payable');
});

// ---- flagImmaterialSubNotes ---------------------------------------------
t('flagImmaterialSubNotes: tiny singleton in busy note flagged; big/multi/small-note clean', () => {
  const F = 'Other current liabilities', N = 'Other payables';
  const rows = [
    row({ face: F, note: N, subNote: 'Big Item', ledger: 'A', amount: -1000000 }),
    row({ face: F, note: N, subNote: 'Item 2', ledger: 'B', amount: -500000 }),
    row({ face: F, note: N, subNote: 'Item 3', ledger: 'C', amount: -300000 }),
    row({ face: F, note: N, subNote: 'Item 4', ledger: 'D', amount: -200000 }),
    row({ face: F, note: N, subNote: 'Tiny', ledger: 'E', amount: -500 }),        // singleton, <1% -> flag
    row({ face: F, note: N, subNote: 'Multi', ledger: 'F', amount: -100 }),       // shares...
    row({ face: F, note: N, subNote: 'Multi', ledger: 'G', amount: -100 }),       // ...so not singleton -> clean
    // a different note with only 2 lines -> below MIN_LINES -> never flagged
    row({ face: F, note: 'Statutory dues', subNote: 'X', ledger: 'H', amount: -10 }),
    row({ face: F, note: 'Statutory dues', subNote: 'Y', ledger: 'I', amount: -99999 }),
  ];
  flagImmaterialSubNotes(rows);
  assert.ok(rows[4].flags.includes('immaterial'), 'tiny singleton flagged');
  assert.ok(!rows[0].flags.includes('immaterial'), 'big item clean');
  assert.ok(!rows[5].flags.includes('immaterial') && !rows[6].flags.includes('immaterial'), 'multi-ledger sub-note clean');
  assert.ok(!rows[7].flags.includes('immaterial'), 'small note (< MIN_LINES) never flagged');
});

// ---- flagProvisionPlacement ---------------------------------------------
t('flagProvisionPlacement: provision off Provisions face flagged; on-face + doubtful clean', () => {
  const rows = [
    row({ ledger: 'Provision for Income Tax', face: 'Other current liabilities', note: 'Other payables' }), // flag
    row({ ledger: 'Provision of Income Tax', face: 'Short term provisions', note: 'Provision for income tax' }), // on-face clean
    row({ ledger: 'Provision for doubtful debts', face: 'Trade receivables', note: 'Provision for doubtful debts' }), // contra clean
    row({ ledger: 'Salary Payable', face: 'Other current liabilities', note: 'Other payables' }), // not a provision
  ];
  const n = flagProvisionPlacement(rows);
  assert.equal(n, 1);
  assert.match(rows[0].flags.join(), /Short\/Long term provisions/);
  assert.equal(rows[1].flags.length, 0);
  assert.equal(rows[2].flags.length, 0);
  assert.equal(rows[3].flags.length, 0);
});

// ---- flagYoyReclassification --------------------------------------------
t('flagYoyReclassification: face/note change flagged; same or no-PY clean', () => {
  const rows = [
    row({ ledger: 'A', face: 'Short term borrowings', note: 'x', pyFace: 'Long term borrowings', pyNote: 'y' }), // face changed -> flag
    row({ ledger: 'B', face: 'Other current liabilities', note: 'Other payables', pyFace: 'Other current liabilities', pyNote: 'Statutory dues' }), // note changed -> flag
    row({ ledger: 'C', face: 'Trade receivables', note: 'Unsecured considered good', pyFace: 'Trade receivables', pyNote: 'Unsecured considered good' }), // same -> clean
    row({ ledger: 'D', face: 'Cash and Cash Equivalents', note: 'Cash on hand', pyFace: '', pyNote: '' }), // no PY -> clean
  ];
  const n = flagYoyReclassification(rows);
  assert.equal(n, 2);
  assert.match(rows[0].flags.join(), /reclassified from last year/);
  assert.match(rows[1].flags.join(), /reclassified from last year/);
  assert.equal(rows[2].flags.length, 0);
  assert.equal(rows[3].flags.length, 0);
});

// ---- reviewFlagsText (export filter) ------------------------------------
t('reviewFlagsText: keeps actionable, drops internal', () => {
  assert.equal(reviewFlagsText(row({ flags: ['sub-note blank', 'deterministic sub-note'] })), '');
  assert.equal(reviewFlagsText(row({ flags: ['verify: credit balance unusual for X'] })), 'credit balance unusual for X');
});

// ---- vocab resolvers ----------------------------------------------------
t('canonicalFace: aliases resolve; canonicalNote validates', () => {
  assert.equal(canonicalFace('property, plant and equipment'), 'Property Plant and Equipment');
  assert.equal(canonicalFace('share capital'), 'Share capital');
  assert.equal(canonicalFace('not a real face'), '');
  assert.ok(NOTES_BY_FACE['Other current liabilities'].includes('Statutory dues'));
  assert.equal(canonicalNote('Other current liabilities', 'statutory dues'), 'Statutory dues');
});

// ---- parsePasted --------------------------------------------------------
t('parsePasted: robust amount parsing (sign, currency, Cr/Dr, Indian grouping)', () => {
  const amt = (a) => parsePasted('Name of Ledger\tAmount\nX\t' + a).rows[0].amount;
  assert.equal(amt('₹ -45,000.50'), -45000.5, 'symbol before minus keeps sign');
  assert.equal(amt('(2,06,919)'), -206919, 'bracket negative');
  assert.equal(amt('45000 Cr'), -45000, 'Cr suffix = credit');
  assert.equal(amt('45000 Dr'), 45000, 'Dr suffix = debit');
  assert.equal(amt('Rs. -1000'), -1000);
  assert.equal(amt('₹1,23,456'), 123456, 'Indian digit grouping');
});
t('parsePasted: detects columns + Tally group', () => {
  const p = parsePasted('System Primary Grouping\tName of Ledger\tAmount\tFace Grouping\nDuties & Taxes\tGST Payable\t-1000\tOther current liabilities');
  assert.equal(p.rows.length, 1);
  assert.equal(p.rows[0].ledger, 'GST Payable');
  assert.equal(p.rows[0].sysPrimary, 'Duties & Taxes');
  assert.equal(p.rows[0].amount, -1000);
});

// ---- run ----------------------------------------------------------------
let failed = 0;
for (const [name, fn] of cases) {
  try { fn(); passed++; console.log(`  ok  ${name}`); }
  catch (e) { failed++; console.error(`FAIL  ${name}\n      ${e.message}`); }
}
console.log(`\n${passed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
