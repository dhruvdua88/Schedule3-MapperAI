// ============ SCHEDULE III GROUPING VOCABULARY (AUTHORITATIVE) ============
// Extracted from the Schedule III Automation Tool's OWN data-validation logic
// (Fortius workbook), NOT guessed from a sheet. The tool validates:
//   - Face (col G): dropdown = T_B!$EF$4:$EF$57  -> FACE_HEADS below.
//   - Note (col H): dependent dropdown = INDIRECT(SUBSTITUTE(Face," ","_")),
//                   i.e. a per-Face named range -> NOTES_BY_FACE below (the exact
//                   allowed notes for each face, e.g. "Statutory dues" IS valid
//                   under "Other current liabilities").
//   - Sub-Note (col I): NO data validation -> free text (Level 3 presentation).
// A paste of (Face, Note) is guaranteed to satisfy the workbook's validations
// only if each value is copied verbatim from these lists.

export const SCH3_VOCAB = [
 {
  "face": "Capital work in progress",
  "notes": [
   "Captured in Notes-2"
  ],
  "section": "BS"
 },
 {
  "face": "Cash and Cash Equivalents",
  "notes": [
   "Cash on hand",
   "Cheques, drafts on hand",
   "Balances with banks in current accounts",
   "Bank Deposit having maturity of less than 3 months",
   "Bank Deposit having maturity of greater than 3 months and less than 12 months",
   "Bank Deposit having maturity of greater than 12 months",
   "Others",
   "Less: Deposits reclassified to other non current assets"
  ],
  "section": "BS"
 },
 {
  "face": "Change in Inventories of work in progress and finished goods",
  "notes": [
   "Captured from Q_Disc"
  ],
  "section": "PL"
 },
 {
  "face": "Cost of material consumed",
  "notes": [
   "Captured from Q_Disc",
   "Other Manufacturing Expenses"
  ],
  "section": "PL"
 },
 {
  "face": "Current investments",
  "notes": [
   "Quoted Trade Investments in Equity Instruments",
   "Quoted Trade Investments in preference shares",
   "Quoted Trade Investments in Government or trust securities",
   "Quoted Trade Investments in debentures or bonds",
   "Quoted Trade Investments in Mutual Funds",
   "Unquoted Trade Investments in Equity Instruments",
   "Unquoted Trade Investments in preference shares",
   "Unquoted Trade Investments in Government or trust securities",
   "Unquoted Trade Investments in debentures or bonds",
   "Unquoted Trade Investments in Mutual Funds",
   "Quoted Other Investments in Equity Instruments",
   "Quoted Other Investments in preference shares",
   "Quoted Other Investments in Government or trust securities",
   "Quoted Other Investments in debentures or bonds",
   "Quoted Other Investments in Mutual Funds",
   "Unquoted Other Investments in Equity Instruments",
   "Unquoted Other Investments in preference shares",
   "Unquoted Other Investments in Government or trust securities",
   "Unquoted Other Investments in debentures or bonds",
   "Unquoted Other Investments in Mutual Funds",
   "Investments in partnership firms",
   "Other investments"
  ],
  "section": "BS"
 },
 {
  "face": "Deferred tax assets net",
  "notes": [
   "Specify at level 3"
  ],
  "section": "BS"
 },
 {
  "face": "Deferred tax liabilities Net",
  "notes": [
   "Specify at level 3"
  ],
  "section": "BS"
 },
 {
  "face": "Depreciation and amortization expenses",
  "notes": [
   "Depreciation on property, plant and equipment",
   "Amortization of intangible assets",
   "Depreciation on investment property",
   "Specify at level 3"
  ],
  "section": "PL"
 },
 {
  "face": "Employee benefit expenses",
  "notes": [
   "Salaries and wages",
   "Contribution to provident and other funds",
   "Expense on ESOP and ESPP",
   "Staff welfare expenses",
   "Specify at level 3"
  ],
  "section": "PL"
 },
 {
  "face": "Exceptional item",
  "notes": [
   "Specify at level 3"
  ],
  "section": "PL"
 },
 {
  "face": "Extraordinary Item",
  "notes": [
   "Specify at level 3"
  ],
  "section": "PL"
 },
 {
  "face": "Finance costs",
  "notes": [
   "Interest expense",
   "Other borrowing costs",
   "Applicable net gain/loss on foreign currency transactions and translation",
   "Specify at level 3"
  ],
  "section": "PL"
 },
 {
  "face": "Intangible assets",
  "notes": [
   "Captured from FAR"
  ],
  "section": "BS"
 },
 {
  "face": "Intangible assets under development",
  "notes": [
   "Captured in Notes-2"
  ],
  "section": "BS"
 },
 {
  "face": "Inventories",
  "notes": [
   "Captured from Q_Disc"
  ],
  "section": "BS"
 },
 {
  "face": "Long term borrowings",
  "notes": [
   "Secured Bonds/debentures",
   "Secured Term loans from banks",
   "Secured Term loans from other parties",
   "Secured Deferred payment liabilities",
   "Secured Deposits",
   "Secured Loans and advances from related parties",
   "Secured Long term maturities of finance lease obligations",
   "Secured Other loans and advances",
   "Unsecured Bonds/debentures",
   "Unsecured Term loans from banks",
   "Unsecured Term loans from other parties",
   "Unsecured Deferred payment liabilities",
   "Unsecured Deposits",
   "Unsecured Loans and advances from related parties",
   "Unsecured Long term maturities of finance lease obligations",
   "Unsecured Other loans and advances"
  ],
  "section": "BS"
 },
 {
  "face": "Long term loans and advances",
  "notes": [
   "Capital Advances",
   "Loans and advances to related parties",
   "Advance Income Tax (Net of provision for taxes)",
   "Balances with Government Authorities",
   "Other loans and advances (Secured, considered good)",
   "Other loans and advances (Unsecured, considered good)",
   "Other loans and advances (Doubtful)",
   "Provision for doubtful advances",
   "Others",
   "Specify at level 3"
  ],
  "section": "BS"
 },
 {
  "face": "Long term provisions",
  "notes": [
   "Provision for employee benefits",
   "Provision for others",
   "Others",
   "Specify at level 3"
  ],
  "section": "BS"
 },
 {
  "face": "Money received against share warrants",
  "notes": [
   "Specify at level 3"
  ],
  "section": "BS"
 },
 {
  "face": "Non current investments",
  "notes": [
   "Investment property",
   "Quoted Trade Investments in Equity Instruments",
   "Quoted Trade Investments in preference shares",
   "Quoted Trade Investments in Government or trust securities",
   "Quoted Trade Investments in debentures or bonds",
   "Quoted Trade Investments in Mutual Funds",
   "Unquoted Trade Investments in Equity Instruments",
   "Unquoted Trade Investments in preference shares",
   "Unquoted Trade Investments in Government or trust securities",
   "Unquoted Trade Investments in debentures or bonds",
   "Unquoted Trade Investments in Mutual Funds",
   "Quoted Other Investments in Equity Instruments",
   "Quoted Other Investments in preference shares",
   "Quoted Other Investments in Government or trust securities",
   "Quoted Other Investments in debentures or bonds",
   "Quoted Other Investments in Mutual Funds",
   "Unquoted Other Investments in Equity Instruments",
   "Unquoted Other Investments in preference shares",
   "Unquoted Other Investments in Government or trust securities",
   "Unquoted Other Investments in debentures or bonds",
   "Unquoted Other Investments in Mutual Funds",
   "Investments in partnership firms",
   "Other non-current investments"
  ],
  "section": "BS"
 },
 {
  "face": "Other current assets",
  "notes": [
   "Interest accrued",
   "Assets held for disposal",
   "Others",
   "Specify at level 3"
  ],
  "section": "BS"
 },
 {
  "face": "Other current liabilities",
  "notes": [
   "Current maturities of finance lease obligations",
   "Interest accrued but not due on borrowings",
   "Interest accrued and due on borrowings",
   "Income received in advance",
   "Unpaid dividends",
   "Application money received for allotment of securities and due for refund and interest accrued thereon",
   "Unpaid matured deposits and interest accrued thereon",
   "Unpaid matured debentures and interest accrued thereon",
   "Statutory dues",
   "Salaries and wages payable",
   "Advances from customers",
   "Creditors for capital goods",
   "Other payables",
   "Specify at level 3"
  ],
  "section": "BS"
 },
 {
  "face": "Other expenses",
  "notes": [
   "Auditors' Remuneration",
   "Administrative Expenses",
   "Advertisement",
   "Bad debts",
   "Commission",
   "Consultancy fees",
   "Consumption of stores and spare parts",
   "Conveyance expenses",
   "Direct expenses",
   "Freight Inward",
   "Freight outward",
   "Indirect expenses",
   "Insurance",
   "Manufacturing Expenses",
   "Power and fuel",
   "Professional fees",
   "Provision for bad and doubtful debts",
   "Rent",
   "Repairs to buildings",
   "Repairs to machinery",
   "Repairs others",
   "Rates and taxes",
   "Royalty",
   "Selling & Distribution Expenses",
   "Other Business Administrative Expenses",
   "Telephone expenses",
   "Travelling Expenses",
   "Miscellaneous expenses",
   "Other Expenses",
   "Specify at level 3"
  ],
  "section": "PL"
 },
 {
  "face": "Other Income",
  "notes": [
   "Interest Income",
   "Dividend Income",
   "Net gain/loss on sale of investments",
   "Other non-operating income (net of expenses)",
   "Others",
   "Specify at level 3"
  ],
  "section": "PL"
 },
 {
  "face": "Other Long term liabilities",
  "notes": [
   "Trade payable due to MSME",
   "Trade payable due to Others",
   "Others"
  ],
  "section": "BS"
 },
 {
  "face": "Other non current assets",
  "notes": [
   "Long-term Trade Receivables (Secured, considered good)",
   "Long-term Trade Receivables (Unsecured, considered good)",
   "Long-term Trade Receivables (Doubtful)",
   "Provision for doubtful debts",
   "Security Deposits",
   "Bank Deposit having maturity of greater than 12 months",
   "Others"
  ],
  "section": "BS"
 },
 {
  "face": "Prior Period Item",
  "notes": [
   "Specify at level 3"
  ],
  "section": "PL"
 },
 {
  "face": "Profit loss from discontinuing operation before tax",
  "notes": [
   "Specify at level 3"
  ],
  "section": "PL"
 },
 {
  "face": "Property Plant and Equipment",
  "notes": [
   "Captured from FAR"
  ],
  "section": "BS"
 },
 {
  "face": "Purchases of stock in trade",
  "notes": [
   "Purchases of goods",
   "Other direct expenses",
   "Specify at level 3"
  ],
  "section": "PL"
 },
 {
  "face": "Reserves and surplus",
  "notes": [
   "Capital Reserves",
   "Capital Redemption Reserve",
   "Securities Premium",
   "Debenture Redemption Reserve",
   "General Reserve",
   "Revaluation Reserve",
   "Share Options Outstanding Account",
   "MAT Credit Entitlement Reserve",
   "Profit & Loss Account",
   "Other Reserves",
   "Other Reserves 1"
  ],
  "section": "BS"
 },
 {
  "face": "Revenue from operations",
  "notes": [
   "Sale of products",
   "Sale of services",
   "Grants or donations received",
   "Other operating revenues",
   "Others",
   "Specify at level 3"
  ],
  "section": "PL"
 },
 {
  "face": "Share application money pending allotment",
  "notes": [
   "Specify at level 3"
  ],
  "section": "BS"
 },
 {
  "face": "Share capital",
  "notes": [
   "Issued Equity Share Capital",
   "Preference Share Capital"
  ],
  "section": "BS"
 },
 {
  "face": "Short term borrowings",
  "notes": [
   "Current maturities of long-term debt",
   "Secured Loans repayable on demand from banks",
   "Secured Loans repayable on demand from other parties",
   "Secured Loans and advances from related parties",
   "Secured Deposits",
   "Secured Other loans and advances",
   "Unsecured Loans repayable on demand from banks",
   "Unsecured Loans repayable on demand from other parties",
   "Unsecured Loans and advances from related parties",
   "Unsecured Deposits",
   "Unsecured Other loans and advances"
  ],
  "section": "BS"
 },
 {
  "face": "Short term loans and advances",
  "notes": [
   "Loans and advances to related parties",
   "Loans and advances to employees",
   "Advances to suppliers",
   "Advance Income Tax (Net of provision for taxes)",
   "Balances with Government Authorities",
   "Other loans and advances (Secured, considered good)",
   "Other loans and advances (Unsecured, considered good)",
   "Other loans and advances (Doubtful)",
   "Provision for doubtful advances",
   "Others",
   "Specify at level 3"
  ],
  "section": "BS"
 },
 {
  "face": "Short term provisions",
  "notes": [
   "Provision for employee benefits",
   "Provision for income tax",
   "Provision for others",
   "Others",
   "Specify at level 3"
  ],
  "section": "BS"
 },
 {
  "face": "Tax Expenses",
  "notes": [
   "Current Tax",
   "Deferred Tax",
   "MAT Credit Entitlement",
   "Prior Period Taxes",
   "Excess/Short Provision Written back/off"
  ],
  "section": "PL"
 },
 {
  "face": "Tax expenses of discontinuing operation",
  "notes": [
   "Specify at level 3"
  ],
  "section": "PL"
 },
 {
  "face": "Trade payables due to MSME",
  "notes": [
   "Due to Micro and Small Enterprises"
  ],
  "section": "BS"
 },
 {
  "face": "Trade payables due to others",
  "notes": [
   "Due to others"
  ],
  "section": "BS"
 },
 {
  "face": "Trade receivables",
  "notes": [
   "Secured considered good",
   "Unsecured considered good",
   "Doubtful",
   "Provision for doubtful debts"
  ],
  "section": "BS"
 }
];

export const FACE_HEADS = SCH3_VOCAB.map((f) => f.face);

// Face -> [allowed note strings] (the dependent dropdown for that face).
export const NOTES_BY_FACE = Object.fromEntries(
  SCH3_VOCAB.map((f) => [f.face, f.notes])
);

const _norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

const _faceIndex = Object.fromEntries(FACE_HEADS.map((f) => [_norm(f), f]));

// Synonyms / older labels a pasted TB may use for a Face head.
const _faceAliases = {
  'ppe': 'Property Plant and Equipment',
  'property, plant and equipment': 'Property Plant and Equipment',
  'tangible assets': 'Property Plant and Equipment',
  'fixed assets': 'Property Plant and Equipment',
  'cwip': 'Capital work in progress',
  'reserves & surplus': 'Reserves and surplus',
  'reserve and surplus': 'Reserves and surplus',
  'reserve & surplus': 'Reserves and surplus',
  'cash and cash equivalents': 'Cash and Cash Equivalents',
  'cash & cash equivalents': 'Cash and Cash Equivalents',
  'cash and bank balances': 'Cash and Cash Equivalents',
  'sundry creditors': 'Trade payables due to others',
  'sundry debtors': 'Trade receivables',
};

export function canonicalFace(raw) {
  if (!raw) return '';
  const k = _norm(raw);
  return _faceIndex[k] || _faceAliases[k] || '';
}

export function canonicalNote(face, raw) {
  const notes = NOTES_BY_FACE[face];
  if (!notes || !raw) return '';
  const k = _norm(raw);
  return notes.find((n) => _norm(n) === k) || '';
}
