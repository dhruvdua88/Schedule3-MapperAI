// ============ EXCEL EXPORT — ExcelJS (loaded from cdnjs CDN) ============
//
// Produces a 5-sheet .xlsx working paper:
//   1. Cover          — KPI hero tiles, severity tiles, status cards, engagement grid, financial table
//   2. Schedule III   — Issues table with severity colour-coding
//   3. CARO Applicability — Threshold test grid
//   4. CARO Annexure A   — 21-clause wording table (when CARO applies)
//   5. Audit Report Fields — Signature block + Rule 11 confirmations snapshot
//
// Ported verbatim from the source artifact; refactored as a standalone async function.

import { SEVERITY } from '../styles/tokens.js';
import { formatLongDate } from './format.js';

// ---- Load ExcelJS from cdnjs (cached on window after first load) ----
function loadExcelJS() {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.ExcelJS) return resolve(window.ExcelJS);
    const existing = document.querySelector('script[data-exceljs]');
    if (existing) {
      existing.addEventListener('load',  () => window.ExcelJS ? resolve(window.ExcelJS) : reject(new Error('ExcelJS load incomplete')));
      existing.addEventListener('error', () => reject(new Error('ExcelJS script failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    script.async = true;
    script.dataset.exceljs = 'true';
    let done = false;
    script.onload  = () => { if (!done) { done = true; window.ExcelJS ? resolve(window.ExcelJS) : reject(new Error('ExcelJS not on window')); } };
    script.onerror = () => { if (!done) { done = true; reject(new Error('Failed to load ExcelJS from cdnjs.cloudflare.com')); } };
    setTimeout(() => { if (!done) { done = true; reject(new Error('CDN load timeout (12 s)')); } }, 12000);
    document.head.appendChild(script);
  });
}

// ---- ARGB colour tokens for ExcelJS (FF prefix = full opacity) ----
const C = {
  GREEN_DARK: 'FF1A3D2E', GREEN_LIGHT: 'FFF4F7EE', GREEN_TEXT: 'FF3E6034',
  CREAM:      'FFFAF6EE', CREAM_BG:   'FFFEF9F1', SAND:        'FFFDF9EF',
  CARD:       'FFFFFDF7', WHITE:       'FFFFFFFF',
  BORDER:     'FFE8E1D2', BORDER_BOLD: 'FFD4CAB4',
  TEXT:       'FF1C1F1C', MUTED:       'FF5C5E58',
  CRIT: 'FF9A2920', HIGH: 'FFA85D1A', MED: 'FF8C721B', LOW: 'FF3E6034',
  CRIT_BG: 'FFFDF3F0', HIGH_BG: 'FFFDF6ED', MED_BG: 'FFFBF8ED', LOW_BG: 'FFF4F7EE',
};

/**
 * Export to Excel.
 * @param {object} opts
 * @param {object} opts.analysis      - Schedule III analysis result
 * @param {object} opts.caro          - CARO analysis result
 * @param {object} opts.reportFields  - Audit report fields
 */
export async function exportExcel({ analysis, caro, reportFields }) {
  const ExcelJS = await loadExcelJS();
  const co  = analysis.company;
  const m   = analysis.keyMetrics;
  const rf  = reportFields;
  const ifcofrApplies = (m.revenueLakhs || 0) >= 5000;
  const caroApplies   = !!caro?.applicability?.applies;

  // ---- Font presets ----
  const FB  = { name: 'Calibri', size: 10, color: { argb: C.TEXT } };
  const FBB = { ...FB, bold: true };
  const FT  = { name: 'Calibri', size: 16, bold: true, color: { argb: C.WHITE } };
  const FS  = { name: 'Calibri', size: 10, italic: true, color: { argb: C.MUTED } };
  const FSC = { name: 'Calibri', size: 11, bold: true, color: { argb: C.CREAM } };
  const FTH = { name: 'Calibri', size: 10, bold: true, color: { argb: C.CREAM } };
  const FLB = { name: 'Calibri', size: 10, bold: true, color: { argb: C.TEXT } };

  const FILL_GREEN = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.GREEN_DARK } };
  const FILL_SAND  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.SAND } };
  const FILL_CREAM = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.CREAM } };
  const FILL_CARD  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.CARD } };

  const BT  = { style: 'thin', color: { argb: C.BORDER } };
  const BALL = { top: BT, left: BT, bottom: BT, right: BT };

  const sevFill = (sev) => ({
    CRITICAL: { type: 'pattern', pattern: 'solid', fgColor: { argb: C.CRIT } },
    HIGH:     { type: 'pattern', pattern: 'solid', fgColor: { argb: C.HIGH } },
    MEDIUM:   { type: 'pattern', pattern: 'solid', fgColor: { argb: C.MED  } },
    LOW:      { type: 'pattern', pattern: 'solid', fgColor: { argb: C.LOW  } },
  }[sev] || FILL_SAND);

  // ---- Workbook ----
  const wb = new ExcelJS.Workbook();
  wb.creator        = rf.firmName;
  wb.lastModifiedBy = rf.partnerName;
  wb.created        = new Date();
  wb.modified       = new Date();
  wb.properties     = { date1904: false };

  // ================================================================
  // SHEET 1 — COVER DASHBOARD
  // ================================================================
  const cover = wb.addWorksheet('Cover', {
    properties: { tabColor: { argb: C.GREEN_DARK } },
    views: [{ showGridLines: false, zoomScale: 100 }],
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
    headerFooter: { oddFooter: `&L${rf.firmName} · ${rf.firmFRN}&CCONFIDENTIAL — AUDIT WORKING PAPER&RPage &P of &N` },
  });
  cover.columns = Array(8).fill({ width: 13 });

  const sevCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  (analysis.scheduleIIIIssues || []).forEach((i) => { if (sevCounts[i.severity] !== undefined) sevCounts[i.severity]++; });
  const totalIssues = (analysis.scheduleIIIIssues || []).length;

  const sectionBand = (r, text) => {
    cover.mergeCells(r, 1, r, 8);
    const c = cover.getCell(r, 1);
    c.value = text;
    c.font  = { name: 'Calibri', size: 9, bold: true, color: { argb: C.GREEN_TEXT } };
    c.fill  = FILL_CREAM;
    c.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    c.border = { bottom: { style: 'medium', color: { argb: C.GREEN_DARK } } };
    cover.getRow(r).height = 20;
  };

  const drawTile = (startCol, endCol, labelRow, valueRow, label, value, opts = {}) => {
    const labelFill  = opts.labelFill  || FILL_CREAM;
    const valueFill  = opts.valueFill  || { type: 'pattern', pattern: 'solid', fgColor: { argb: C.WHITE } };
    const labelColor = opts.labelColor || C.MUTED;
    const valueColor = opts.valueColor || C.GREEN_DARK;
    const valueSize  = opts.valueSize  || 22;
    const accentColor = opts.accentColor || C.GREEN_DARK;

    cover.mergeCells(labelRow, startCol, labelRow, endCol);
    const lc = cover.getCell(labelRow, startCol);
    lc.value = label;
    lc.font  = { name: 'Calibri', size: 9, bold: true, color: { argb: labelColor } };
    lc.fill  = labelFill;
    lc.alignment = { horizontal: 'center', vertical: 'middle' };
    lc.border = { top: { style: 'medium', color: { argb: accentColor } }, left: BT, right: BT };
    cover.getRow(labelRow).height = 18;

    cover.mergeCells(valueRow, startCol, valueRow, endCol);
    const vc = cover.getCell(valueRow, startCol);
    vc.value = value;
    vc.font  = { name: 'Calibri', size: valueSize, bold: true, color: { argb: valueColor } };
    vc.fill  = valueFill;
    vc.alignment = { horizontal: 'center', vertical: 'middle' };
    vc.border = { left: BT, right: BT, bottom: { style: 'medium', color: { argb: accentColor } } };
    if (opts.numFmt) vc.numFmt = opts.numFmt;
    cover.getRow(valueRow).height = 44;
  };

  // Row 1-2: Title bar
  cover.mergeCells('A1:H2');
  const titleCell = cover.getCell('A1');
  titleCell.value = { richText: [
    { text: 'SCHEDULE III REVIEW   ·   WORKING PAPER\n', font: { name: 'Calibri', size: 22, bold: true, color: { argb: C.WHITE } } },
    { text: co.name || 'Auditee',                        font: { name: 'Calibri', size: 13, italic: true, color: { argb: C.CREAM } } },
  ]};
  titleCell.fill = FILL_GREEN;
  titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cover.getRow(1).height = 36; cover.getRow(2).height = 26;

  // Row 3: Meta band
  cover.mergeCells('A3:H3');
  const metaCell = cover.getCell('A3');
  metaCell.value = `${rf.firmName}   ·   FRN ${rf.firmFRN}   ·   Partner: ${rf.partnerName}   ·   Generated ${new Date().toLocaleString('en-IN')}`;
  metaCell.font  = { name: 'Calibri', size: 9, italic: true, color: { argb: C.MUTED } };
  metaCell.fill  = FILL_SAND;
  metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
  metaCell.border = { bottom: BT };
  cover.getRow(3).height = 18;
  cover.getRow(4).height = 8;

  // Row 5: Financial highlights band
  sectionBand(5, '   FINANCIAL HIGHLIGHTS  —  Rs in Lakhs');

  // Rows 6-7: KPI hero tiles
  drawTile(1, 2, 6, 7, 'REVENUE FROM OPS',  m.revenueLakhs          ?? 0, { numFmt: '#,##0.00;(#,##0.00);"—"', accentColor: C.GREEN_DARK });
  drawTile(3, 4, 6, 7, 'PROFIT BEFORE TAX', m.profitBeforeTaxLakhs  ?? 0, { numFmt: '#,##0.00;[Red](#,##0.00);"—"', accentColor: (m.profitBeforeTaxLakhs ?? 0) < 0 ? C.CRIT : C.GREEN_DARK, valueColor: (m.profitBeforeTaxLakhs ?? 0) < 0 ? C.CRIT : C.GREEN_DARK });
  drawTile(5, 6, 6, 7, 'TOTAL ASSETS',      m.totalAssetsLakhs      ?? 0, { numFmt: '#,##0.00;(#,##0.00);"—"', accentColor: C.GREEN_DARK });
  drawTile(7, 8, 6, 7, 'TOTAL BORROWINGS',  m.totalBorrowingsLakhs  ?? 0, { numFmt: '#,##0.00;(#,##0.00);"—"', accentColor: C.GREEN_DARK });
  cover.getRow(8).height = 10;

  // Row 9: Severity band
  sectionBand(9, `   ISSUES BY SEVERITY  —  ${totalIssues} TOTAL FLAGGED`);

  // Rows 10-11: Severity tiles
  [
    { label: 'CRITICAL', count: sevCounts.CRITICAL, fill: C.CRIT },
    { label: 'HIGH',     count: sevCounts.HIGH,     fill: C.HIGH },
    { label: 'MEDIUM',   count: sevCounts.MEDIUM,   fill: C.MED  },
    { label: 'LOW',      count: sevCounts.LOW,       fill: C.LOW  },
  ].forEach((t, idx) => {
    const sc = idx * 2 + 1, ec = sc + 1;
    cover.mergeCells(10, sc, 10, ec);
    const lc = cover.getCell(10, sc);
    lc.value = t.label; lc.font = { name: 'Calibri', size: 9, bold: true, color: { argb: C.CREAM } };
    lc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: t.fill } };
    lc.alignment = { horizontal: 'center', vertical: 'middle' };
    lc.border = { top: { style: 'medium', color: { argb: t.fill } }, left: BT, right: BT };
    cover.mergeCells(11, sc, 11, ec);
    const vc = cover.getCell(11, sc);
    vc.value = t.count; vc.numFmt = '0';
    vc.font = { name: 'Calibri', size: 32, bold: true, color: { argb: C.CREAM } };
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: t.fill } };
    vc.alignment = { horizontal: 'center', vertical: 'middle' };
    vc.border = { left: BT, right: BT, bottom: { style: 'medium', color: { argb: t.fill } } };
  });
  cover.getRow(10).height = 18; cover.getRow(11).height = 50; cover.getRow(12).height = 10;

  // Row 13: Compliance status band
  sectionBand(13, '   COMPLIANCE STATUS');

  // Rows 14-16: Status cards (CARO + IFCoFR)
  const drawStatusCard = (sc, ec, hRow, sRow, rRow, headerText, status, reasoning, statusColor) => {
    cover.mergeCells(hRow, sc, hRow, ec);
    const hc = cover.getCell(hRow, sc);
    hc.value = headerText; hc.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.CREAM } };
    hc.fill = FILL_GREEN; hc.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }; hc.border = BALL;
    cover.getRow(hRow).height = 22;
    cover.mergeCells(sRow, sc, sRow, ec);
    const sc2 = cover.getCell(sRow, sc);
    sc2.value = status; sc2.font = { name: 'Calibri', size: 18, bold: true, color: { argb: C.CREAM } };
    sc2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } };
    sc2.alignment = { horizontal: 'center', vertical: 'middle' }; sc2.border = { left: BT, right: BT };
    cover.getRow(sRow).height = 36;
    cover.mergeCells(rRow, sc, rRow, ec);
    const rc = cover.getCell(rRow, sc);
    rc.value = reasoning; rc.font = { name: 'Calibri', size: 9, italic: true, color: { argb: C.MUTED } };
    rc.fill = FILL_SAND; rc.alignment = { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 };
    rc.border = { left: BT, right: BT, bottom: BT };
    cover.getRow(rRow).height = 38;
  };
  drawStatusCard(1, 4, 14, 15, 16, '  CARO 2020',
    caroApplies ? 'APPLIES' : 'EXEMPT',
    caro?.applicability?.reasoning || '—',
    caroApplies ? C.HIGH : C.LOW);
  drawStatusCard(5, 8, 14, 15, 16, '  IFCoFR · Sec 143(3)(i)',
    ifcofrApplies ? 'APPLIES' : 'EXEMPT',
    `Turnover-only test: Rs ${((m.revenueLakhs || 0) / 100).toFixed(2)} cr vs Rs 50 cr threshold`,
    ifcofrApplies ? C.HIGH : C.LOW);
  cover.getRow(17).height = 10;

  // Row 18: Engagement & Auditee band
  sectionBand(18, '   ENGAGEMENT & AUDITEE');

  const writeInfoRow = (rowNum, ll, lv, rl, rv) => {
    [[1,2,ll,FLB,FILL_CREAM],[3,4,lv,FB,null],[5,6,rl,FLB,FILL_CREAM],[7,8,rv,FB,null]].forEach(([sc,ec,val,font,fill]) => {
      cover.mergeCells(rowNum, sc, rowNum, ec);
      const cell = cover.getCell(rowNum, sc);
      cell.value = val; cell.font = font;
      if (fill) cell.fill = fill;
      cell.alignment = { vertical: 'middle', wrapText: true, indent: 1 };
      cell.border = { left: BT, top: BT, bottom: BT, right: BT };
    });
    cover.getRow(rowNum).height = 22;
  };

  const engPairs = [
    ['Reviewer / Firm', rf.firmName], ['Firm Registration No.', rf.firmFRN],
    ['Partner / Signatory', rf.partnerName], ['Membership Number', rf.membershipNo],
    ['Place', rf.place || '—'], ['Report date', formatLongDate(rf.reportDate)],
  ];
  const audPairs = [
    ['Company name', co.name || '—'], ['CIN', co.cin || '—'],
    ['Year-end', co.yearEnd || '—'], ['Date of incorporation', co.incorporationDate || '—'],
    ['First reporting year', co.isFirstYear ? 'Yes' : 'No'], ['Nature of business', co.natureOfBusiness || '—'],
  ];
  let ir = 19;
  for (let i = 0; i < Math.max(engPairs.length, audPairs.length); i++) {
    writeInfoRow(ir++, ...(engPairs[i] || ['', '']), ...(audPairs[i] || ['', '']));
  }

  // Registered address full-width row
  cover.mergeCells(ir, 1, ir, 2); const addrL = cover.getCell(ir, 1);
  addrL.value = 'Registered address'; addrL.font = FLB; addrL.fill = FILL_CREAM;
  addrL.alignment = { vertical: 'top', wrapText: true, indent: 1 };
  addrL.border = { left: BT, top: BT, bottom: BT };
  cover.mergeCells(ir, 3, ir, 8); const addrV = cover.getCell(ir, 3);
  addrV.value = co.registeredAddress || '—'; addrV.font = FB;
  addrV.alignment = { vertical: 'top', wrapText: true, indent: 1 };
  addrV.border = { right: BT, top: BT, bottom: BT };
  cover.getRow(ir).height = 32; ir += 2;

  // Financial detail table
  sectionBand(ir++, '   FULL FINANCIAL DETAIL  —  Rs in Lakhs');
  // Table header
  [[1,3,'Metric'],[4,4,'Amount'],[5,7,'Metric'],[8,8,'Amount']].forEach(([sc,ec,h]) => {
    cover.mergeCells(ir, sc, ir, ec);
    const c = cover.getCell(ir, sc);
    c.value = h; c.font = FTH; c.fill = FILL_GREEN;
    c.alignment = { horizontal: ec === 4 || ec === 8 ? 'right' : 'left', vertical: 'middle', indent: 1 };
    c.border = BALL;
  });
  cover.getRow(ir).height = 22; ir++;

  const finPairs = [
    [['Revenue from operations', m.revenueLakhs ?? 0],        ['Total assets', m.totalAssetsLakhs ?? 0]],
    [['Profit before tax',       m.profitBeforeTaxLakhs ?? 0], ['Trade receivables', m.tradeReceivablesLakhs ?? 0]],
    [['Profit after tax',        m.profitAfterTaxLakhs ?? 0],  ['Fixed assets / PPE', m.fixedAssetsLakhs ?? 0]],
    [['Current tax expense',     m.currentTaxLakhs ?? 0],      ['Total borrowings', m.totalBorrowingsLakhs ?? 0]],
    [['Advance tax',             m.advanceTaxLakhs ?? 0],      ['Paid-up capital', m.paidUpCapitalLakhs ?? 0]],
    [['Reserves and surplus',    m.reservesLakhs ?? 0],        ['Capital + Reserves', (m.paidUpCapitalLakhs ?? 0) + (m.reservesLakhs ?? 0)]],
  ];
  const finStart = ir;
  finPairs.forEach((pair, i) => {
    const rowFill = i % 2 === 1 ? FILL_SAND : { type: 'pattern', pattern: 'solid', fgColor: { argb: C.WHITE } };
    cover.mergeCells(ir, 1, ir, 3); const lL = cover.getCell(ir, 1);
    lL.value = pair[0][0]; lL.font = FB; lL.fill = rowFill;
    lL.alignment = { vertical: 'middle', indent: 1 }; lL.border = { left: BT, bottom: BT };
    const lV = cover.getCell(ir, 4);
    lV.value = pair[0][1]; lV.font = FBB; lV.fill = rowFill;
    lV.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
    lV.numFmt = '#,##0.00;[Red](#,##0.00);"—"'; lV.border = { right: BT, bottom: BT };
    cover.mergeCells(ir, 5, ir, 7); const rL = cover.getCell(ir, 5);
    rL.value = pair[1][0]; rL.font = FB; rL.fill = rowFill;
    rL.alignment = { vertical: 'middle', indent: 1 }; rL.border = { left: BT, bottom: BT };
    const rV = cover.getCell(ir, 8);
    rV.value = pair[1][1]; rV.font = FBB; rV.fill = rowFill;
    rV.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
    rV.numFmt = '#,##0.00;[Red](#,##0.00);"—"'; rV.border = { right: BT, bottom: BT };
    cover.getRow(ir).height = 20; ir++;
  });
  // Data bars on amount columns
  cover.addConditionalFormatting({ ref: `D${finStart}:D${ir-1}`, rules: [{ type: 'dataBar', cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: C.GREEN_DARK }, gradient: false, showValue: true }] });
  cover.addConditionalFormatting({ ref: `H${finStart}:H${ir-1}`, rules: [{ type: 'dataBar', cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: C.GREEN_DARK }, gradient: false, showValue: true }] });

  // ================================================================
  // SHEET 2 — SCHEDULE III ISSUES
  // ================================================================
  const issuesSorted = [...(analysis.scheduleIIIIssues || [])]
    .sort((a, b) => (SEVERITY[a.severity]?.rank ?? 9) - (SEVERITY[b.severity]?.rank ?? 9));

  const issWS = wb.addWorksheet('Schedule III Issues', {
    properties: { tabColor: { argb: C.CRIT } },
    views: [{ state: 'frozen', ySplit: 4, showGridLines: false, zoomScale: 95 }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
    headerFooter: { oddHeader: `&L&"Calibri,Bold"&14${co.name || ''}&R&"Calibri,Italic"&10Schedule III Working Paper`, oddFooter: `&L${rf.firmName} · ${rf.firmFRN}&CCONFIDENTIAL&RPage &P of &N` },
  });
  issWS.columns = [{ width: 9 },{ width: 13 },{ width: 24 },{ width: 40 },{ width: 75 },{ width: 50 },{ width: 22 },{ width: 52 },{ width: 52 },{ width: 15 },{ width: 34 }];

  // Title
  issWS.mergeCells('A1:K2');
  const issTitle = issWS.getCell('A1');
  issTitle.value = { richText: [
    { text: 'SCHEDULE III SUBSTANTIVE REVIEW\n', font: { name: 'Calibri', size: 18, bold: true, color: { argb: C.WHITE } } },
    { text: `${co.name || ''}  ·  ${issuesSorted.length} issue(s) flagged`, font: { name: 'Calibri', size: 11, italic: true, color: { argb: C.CREAM } } },
  ]};
  issTitle.fill = FILL_GREEN; issTitle.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  issWS.getRow(1).height = 32; issWS.getRow(2).height = 22;
  issWS.mergeCells('A3:K3');
  const issSub = issWS.getCell('A3');
  issSub.value = 'Sorted by severity · use filter chips on row 4 to drill in · severity badges are colour-coded';
  issSub.font = FS; issSub.fill = FILL_SAND; issSub.alignment = { horizontal: 'center', vertical: 'middle' };
  issWS.getRow(3).height = 18;

  const tableRows = issuesSorted.length === 0
    ? [['—','—','—','No issues flagged','—','—','—','—','—','—','']]
    : issuesSorted.map((iss, i) => [
        iss.id || `T${String(i+1).padStart(2,'0')}`,
        iss.severity || '', iss.category || '', iss.title || '',
        iss.observation || '',
        iss.evidenceQuote || '',
        iss.noteRef || '',
        iss.implication || '', iss.recommendation || '', '', '',
      ]);

  issWS.addTable({
    name: 'IssuesTable', ref: 'A4', headerRow: true, totalsRow: false,
    style: { theme: 'TableStyleMedium7', showRowStripes: true },
    columns: [
      { name: 'Test ID', filterButton: true }, { name: 'Severity', filterButton: true },
      { name: 'Category', filterButton: true }, { name: 'Title', filterButton: false },
      { name: 'Observation', filterButton: false },
      { name: 'Evidence Quote', filterButton: false },
      { name: 'Note Ref', filterButton: true },
      { name: 'Implication', filterButton: false },
      { name: 'Recommendation', filterButton: false }, { name: 'Status', filterButton: true },
      { name: 'Reviewer Notes', filterButton: false },
    ],
    rows: tableRows,
  });

  issuesSorted.forEach((iss, i) => {
    const r = i + 5;
    const sevC = issWS.getCell(r, 2);
    sevC.font = FTH; sevC.fill = sevFill(iss.severity); sevC.alignment = { horizontal: 'center', vertical: 'middle' };
    issWS.getCell(r, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    issWS.getCell(r, 1).font = { name: 'Consolas', size: 10, bold: true, color: { argb: C.GREEN_DARK } };
    issWS.getCell(r, 4).font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.GREEN_DARK } };
    issWS.getCell(r, 4).alignment = { vertical: 'top', wrapText: true };
    // Evidence quote — italic, muted
    issWS.getCell(r, 6).font = { name: 'Calibri', size: 10, italic: true, color: { argb: C.MUTED } };
    issWS.getCell(r, 6).alignment = { vertical: 'top', wrapText: true };
    // Note ref — mono, muted
    issWS.getCell(r, 7).font = { name: 'Consolas', size: 10, color: { argb: C.MUTED } };
    issWS.getCell(r, 7).alignment = { horizontal: 'center', vertical: 'top', wrapText: true };
    [5,8,9,10,11].forEach((ci) => { issWS.getCell(r, ci).alignment = { vertical: 'top', wrapText: true }; });
    issWS.getRow(r).height = 90;
  });

  // ================================================================
  // SHEET 3 — CARO APPLICABILITY
  // ================================================================
  if (caro) {
    const cWS = wb.addWorksheet('CARO Applicability', {
      properties: { tabColor: { argb: C.HIGH } },
      views: [{ showGridLines: false, zoomScale: 100 }],
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
      headerFooter: { oddFooter: `&L${rf.firmName}&CCARO 2020 Applicability — ${co.name || ''}&RPage &P of &N` },
    });
    cWS.columns = [{ width: 60 }, { width: 16 }, { width: 38 }];
    cWS.mergeCells('A1:C1'); const ct = cWS.getCell('A1');
    ct.value = 'CARO 2020 — APPLICABILITY ANALYSIS'; ct.font = FT; ct.fill = FILL_GREEN;
    ct.alignment = { horizontal: 'center', vertical: 'middle' }; cWS.getRow(1).height = 32;
    cWS.mergeCells('A2:C2'); const cs = cWS.getCell('A2');
    cs.value = 'Para 1(2)(iv) — All four conditions must hold for exemption'; cs.font = FS;
    cs.alignment = { horizontal: 'center' }; cWS.getRow(2).height = 18;

    let cr = 4;
    // Conclusion section
    cWS.mergeCells(cr, 1, cr, 3); const cSH = cWS.getCell(cr, 1);
    cSH.value = '  CONCLUSION'; cSH.font = FSC; cSH.fill = FILL_GREEN;
    cSH.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }; cWS.getRow(cr).height = 22; cr++;
    const cCL = cWS.getCell(cr, 1); cCL.value = 'Status'; cCL.font = FLB;
    const cCV = cWS.getCell(cr, 3);
    cCV.value = caro.applicability?.applies ? 'CARO 2020 APPLIES' : 'CARO 2020 DOES NOT APPLY (Exempt)';
    cCV.font = FTH;
    cCV.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: caro.applicability?.applies ? C.HIGH : C.LOW } };
    cCV.alignment = { horizontal: 'center', vertical: 'middle' }; cWS.getRow(cr).height = 24; cr++;
    const rL = cWS.getCell(cr, 1); rL.value = 'Reasoning'; rL.font = FLB; rL.alignment = { vertical: 'top' };
    const rV = cWS.getCell(cr, 3); rV.value = caro.applicability?.reasoning || '—'; rV.font = FB;
    rV.alignment = { vertical: 'top', wrapText: true }; cWS.getRow(cr).height = 60; cr += 2;

    // Threshold table
    cWS.mergeCells(cr, 1, cr, 3); const tSH = cWS.getCell(cr, 1);
    tSH.value = '  THRESHOLD TEST'; tSH.font = FSC; tSH.fill = FILL_GREEN;
    tSH.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }; cWS.getRow(cr).height = 22; cr++;
    ['Test', 'Result', 'Value / Reference'].forEach((h, i) => {
      const c = cWS.getCell(cr, i+1); c.value = h; c.font = FTH; c.fill = FILL_GREEN;
      c.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }; c.border = BALL;
    });
    cWS.getRow(cr).height = 22; cr++;
    (caro.applicability?.thresholds || []).forEach((t, i) => {
      const tc = cWS.getCell(cr,1); tc.value = t.test||''; tc.font = FB; tc.alignment = { vertical:'middle', wrapText:true }; tc.border = { bottom: BT };
      const rc = cWS.getCell(cr,2); rc.value = t.result||'Unknown'; rc.font = FTH;
      rc.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: t.result==='Pass' ? C.LOW : (t.result==='Fail' ? C.HIGH : C.MED) } };
      rc.alignment = { horizontal:'center', vertical:'middle' }; rc.border = { bottom: BT };
      const vc = cWS.getCell(cr,3); vc.value = t.value||''; vc.font = FB; vc.alignment = { vertical:'middle' }; vc.border = { bottom: BT };
      if (i%2===1) { tc.fill = FILL_SAND; vc.fill = FILL_SAND; }
      cWS.getRow(cr).height = 30; cr++;
    });
  }

  // ================================================================
  // SHEET 4 — CARO ANNEXURE A WORDING
  // ================================================================
  if (caroApplies && caro.clauses?.length) {
    const aWS = wb.addWorksheet('CARO Annexure A', {
      properties: { tabColor: { argb: C.MED } },
      views: [{ state: 'frozen', ySplit: 4, showGridLines: false, zoomScale: 95 }],
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
      headerFooter: { oddHeader: `&L&"Calibri,Bold"&14${co.name || ''}&R&"Calibri,Italic"&10CARO 2020 — Annexure A Wording`, oddFooter: `&L${rf.firmName}&CCONFIDENTIAL&RPage &P of &N` },
    });
    aWS.columns = [{ width: 5 },{ width: 11 },{ width: 13 },{ width: 40 },{ width: 95 },{ width: 32 },{ width: 30 }];
    aWS.mergeCells('A1:G2');
    const aT = aWS.getCell('A1');
    aT.value = { richText: [
      { text: 'CARO 2020 — ANNEXURE A WORDING\n', font: { name: 'Calibri', size: 18, bold: true, color: { argb: C.WHITE } } },
      { text: `${co.name || ''}  ·  ${caro.clauses.length} clauses`, font: { name: 'Calibri', size: 11, italic: true, color: { argb: C.CREAM } } },
    ]};
    aT.fill = FILL_GREEN; aT.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    aWS.getRow(1).height = 32; aWS.getRow(2).height = 22;
    aWS.mergeCells('A3:G3');
    const aS = aWS.getCell('A3');
    aS.value = 'STANDARD = unmodified default · EDITED = user-revised · REVIEW = AI-flagged for fact-pattern check';
    aS.font = FS; aS.fill = FILL_SAND; aS.alignment = { horizontal: 'center', vertical: 'middle' };
    aWS.getRow(3).height = 18;

    aWS.addTable({
      name: 'AnnexureATable', ref: 'A4', headerRow: true, totalsRow: false,
      style: { theme: 'TableStyleMedium7', showRowStripes: true },
      columns: [
        { name: '#', filterButton: false }, { name: 'Para', filterButton: true },
        { name: 'Status', filterButton: true }, { name: 'Topic', filterButton: true },
        { name: 'Annexure A Wording', filterButton: false }, { name: 'Review Note', filterButton: false },
        { name: 'Reviewer Comments', filterButton: false },
      ],
      rows: caro.clauses.map((c, i) => [
        i+1, c.paragraph||'',
        c.needsReview ? 'REVIEW' : (c.edited ? 'EDITED' : 'STANDARD'),
        c.topic||'', c.remark||'', c.reviewNote||'', '',
      ]),
    });

    caro.clauses.forEach((c, i) => {
      const r = i + 5;
      aWS.getCell(r,1).alignment = { horizontal: 'center', vertical: 'middle' };
      aWS.getCell(r,1).font = { name: 'Consolas', size: 10, color: { argb: C.MUTED } };
      aWS.getCell(r,2).alignment = { horizontal: 'center', vertical: 'middle' };
      aWS.getCell(r,2).font = { name: 'Consolas', size: 10, bold: true, color: { argb: C.GREEN_DARK } };
      const status = c.needsReview ? 'REVIEW' : (c.edited ? 'EDITED' : 'STANDARD');
      const sC = aWS.getCell(r,3);
      sC.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.WHITE } };
      sC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: status==='REVIEW' ? C.HIGH : (status==='EDITED' ? C.LOW : C.MUTED) } };
      sC.alignment = { horizontal: 'center', vertical: 'middle' };
      aWS.getCell(r,4).font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.GREEN_DARK } };
      aWS.getCell(r,4).alignment = { vertical: 'top', wrapText: true };
      [5,6,7].forEach((ci) => { aWS.getCell(r,ci).alignment = { vertical: 'top', wrapText: true }; });
      aWS.getRow(r).height = 130;
    });
  }

  // ================================================================
  // SHEET 5 — AUDIT REPORT FIELDS
  // ================================================================
  {
    const sWS = wb.addWorksheet('Audit Report Fields', {
      properties: { tabColor: { argb: C.LOW } },
      views: [{ showGridLines: false, zoomScale: 100 }],
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
      headerFooter: { oddFooter: `&L${rf.firmName}&CAudit Report Fields Snapshot&RPage &P of &N` },
    });
    sWS.columns = [{ width: 19 },{ width: 22 },{ width: 14 },{ width: 70 }];
    sWS.mergeCells('A1:D1'); const st = sWS.getCell('A1');
    st.value = 'AUDIT REPORT FIELDS'; st.font = FT; st.fill = FILL_GREEN;
    st.alignment = { horizontal: 'center', vertical: 'middle' }; sWS.getRow(1).height = 32;
    sWS.mergeCells('A2:D2'); const ss = sWS.getCell('A2');
    ss.value = 'Snapshot of fields used to generate the .doc Independent Auditor\'s Report';
    ss.font = FS; ss.fill = FILL_SAND; ss.alignment = { horizontal: 'center', vertical: 'middle' }; sWS.getRow(2).height = 18;

    const applySection = (ws, row, text) => {
      ws.mergeCells(row, 1, row, 4); const c = ws.getCell(row, 1);
      c.value = text; c.font = FSC; c.fill = FILL_GREEN;
      c.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }; ws.getRow(row).height = 22;
    };
    const applyKV = (ws, row, label, value) => {
      ws.mergeCells(row, 1, row, 2); const lc = ws.getCell(row, 1);
      lc.value = label; lc.font = FLB; lc.alignment = { vertical: 'middle', wrapText: true, indent: 1 };
      ws.mergeCells(row, 3, row, 4); const vc = ws.getCell(row, 3);
      vc.value = value; vc.font = FB; vc.alignment = { vertical: 'middle', wrapText: true, indent: 1 };
      if (row % 2 === 0) { lc.fill = FILL_SAND; vc.fill = FILL_SAND; }
      ws.getRow(row).height = 22;
    };

    let sr = 4;
    applySection(sWS, sr++, '  SIGNATURE BLOCK');
    [
      ['Firm name', rf.firmName], ['Firm Registration Number', rf.firmFRN],
      ['Partner / Signatory', rf.partnerName], ['Designation', rf.partnerDesignation],
      ['Membership Number', rf.membershipNo], ['UDIN', rf.udin || '(blank — to be entered at signing)'],
      ['Place', rf.place], ['Date of report', formatLongDate(rf.reportDate)],
      ['Accounting software (Rule 11(g))', rf.accountingSoftware],
    ].forEach(([l, v]) => applyKV(sWS, sr++, l, v));
    sr++;

    applySection(sWS, sr++, '  RULE 11 CONFIRMATIONS');
    sWS.mergeCells(sr,1,sr,2); const h0 = sWS.getCell(sr,1);
    h0.value = 'Sub-clause'; h0.font = FTH; h0.fill = FILL_GREEN;
    h0.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }; h0.border = BALL;
    const h1 = sWS.getCell(sr,3); h1.value = 'Reviewed?'; h1.font = FTH; h1.fill = FILL_GREEN;
    h1.alignment = { horizontal: 'center', vertical: 'middle' }; h1.border = BALL;
    const h2 = sWS.getCell(sr,4); h2.value = 'Wording snapshot'; h2.font = FTH; h2.fill = FILL_GREEN;
    h2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }; h2.border = BALL;
    sWS.getRow(sr).height = 22; sr++;

    [
      ['11(a) Pending litigations',       rf.reviewed?.a, rf.rule11a_litigation],
      ['11(b) Long-term contracts',        rf.reviewed?.b, rf.rule11b_longTermContracts],
      ['11(c) IEPF',                       rf.reviewed?.c, rf.rule11c_iepf],
      ['11(e) Ultimate Beneficiary',       rf.reviewed?.e, 'Standard 3-part wording'],
      ['11(f) Dividend (Sec 123)',          rf.reviewed?.f, rf.rule11f_dividend],
      ['11(g) Audit trail',                rf.reviewed?.g, `Standard wording (Software: ${rf.accountingSoftware})`],
    ].forEach(([label, reviewed, snap], i) => {
      sWS.mergeCells(sr,1,sr,2); const lc = sWS.getCell(sr,1);
      lc.value = label; lc.font = FLB; lc.alignment = { vertical: 'middle', wrapText: true, indent: 1 };
      const rc = sWS.getCell(sr,3); rc.value = reviewed ? 'YES' : 'PENDING';
      rc.font = { ...FTH, size: 11 };
      rc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: reviewed ? C.LOW : C.HIGH } };
      rc.alignment = { horizontal: 'center', vertical: 'middle' };
      const wc = sWS.getCell(sr,4); wc.value = snap||'—'; wc.font = FB;
      wc.alignment = { vertical: 'middle', wrapText: true, indent: 1 };
      if (i%2===1) { lc.fill = FILL_SAND; wc.fill = FILL_SAND; }
      sWS.getRow(sr).height = 44; sr++;
    });
  }

  // ---- Write & trigger download ----
  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = `${(co.name || 'Company').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 40)}_Sch3_Working_Paper.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
