// ============ SCHEDULE III REVIEWER — MAIN ORCHESTRATOR ============
// Manages all state, phases, and routing between feature components.
//
// Phase machine:
//   upload → extracting → preview → analyzing-sch3 → analyzing-caro → done | error

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Layers, ShieldCheck, Hash, FileSignature, XCircle, RotateCcw, Building2,
} from 'lucide-react';

import { COLORS, FONTS, SEVERITY, BTN_PRIMARY } from '../styles/tokens.js';
import { SCH3_PROMPT, CARO_PROMPT }              from '../data/prompts.js';
import { STANDARD_CARO_REMARKS }                 from '../data/caroRemarks.js';
import { DEFAULT_REPORT_FIELDS }                 from '../data/reportDefaults.js';
import { extractPdfToMarkdown }                  from '../lib/pdfExtract.js';
import { callDeepSeek, AuthError, RateLimitError, ApiError } from '../lib/deepseek.js';
import { generateReport, downloadAsWord }         from '../lib/docExport.js';
import { exportExcel }                           from '../lib/excelExport.js';
import { fmtLakhs }                              from '../lib/format.js';
import {
  getApiKey, getSettings, saveEngagement, loadEngagement, importEngagement,
  exportEngagement,
} from '../lib/engagementStore.js';

import { SettingsGate }          from './SettingsGate.jsx';
import { SettingsPanel }         from './SettingsPanel.jsx';
import { EngagementHeader }      from './EngagementHeader.jsx';
import { FileUpload }            from './FileUpload.jsx';
import { PdfMarkdownPreview }    from './PdfMarkdownPreview.jsx';
import { AnalyzingProgress }     from './AnalyzingProgress.jsx';
import { SeveritySummary }       from './SeveritySummary.jsx';
import { IssueCard }             from './IssueCard.jsx';
import { CaroApplicabilityView } from './CaroApplicabilityView.jsx';
import { ClauseRow }             from './ClauseRow.jsx';
import { AuditReportTab }        from './AuditReportTab.jsx';

// ── CompanyHeader ────────────────────────────────────────────────────────────
function Metric({ label, value, alert }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: COLORS.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 13, fontWeight: 500, color: alert ? COLORS.CRIT : COLORS.TEXT }}>
        {value}
      </div>
    </div>
  );
}

function CompanyHeader({ company, metrics, counts, caroApplies }) {
  const totalIssues = (counts.CRITICAL || 0) + (counts.HIGH || 0) + (counts.MEDIUM || 0) + (counts.LOW || 0);
  return (
    <div className="card fade-in" style={{ padding: 24, borderRadius: 12, marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Building2 size={14} color={COLORS.TEXT_MUTED} />
            <span style={{ fontSize: 11, color: COLORS.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Auditee
            </span>
          </div>
          <h2 className="serif" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.15, marginBottom: 4 }}>
            {company.name}
          </h2>
          <div className="mono" style={{ fontSize: 12, color: COLORS.TEXT_MUTED }}>
            {company.cin} · FY ending {company.yearEnd}
          </div>
          {company.isFirstYear && (
            <div style={{
              display: 'inline-block', marginTop: 8, padding: '3px 10px',
              background: '#fef9f1', border: `1px solid ${COLORS.BORDER_STRONG}`,
              borderRadius: 999, fontSize: 11, color: COLORS.PRIMARY,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              First reporting period
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: COLORS.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Issues flagged
          </div>
          <div className="serif" style={{ fontSize: 36, fontWeight: 600, lineHeight: 1, color: (counts.CRITICAL || 0) > 0 ? COLORS.CRIT : COLORS.PRIMARY }}>
            {totalIssues}
          </div>
          <div style={{ fontSize: 11, color: COLORS.TEXT_MUTED, marginTop: 4 }}>
            CARO 2020:{' '}
            <strong style={{ color: caroApplies ? COLORS.CRIT : '#3e6034' }}>
              {caroApplies ? 'Applies' : 'Does not apply'}
            </strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, paddingTop: 16, borderTop: `1px solid ${COLORS.BORDER}` }}>
        <Metric label="Revenue"             value={fmtLakhs(metrics.revenueLakhs)} />
        <Metric label="PBT"                 value={fmtLakhs(metrics.profitBeforeTaxLakhs)} />
        <Metric label="Current tax"         value={fmtLakhs(metrics.currentTaxLakhs)}
          alert={metrics.profitBeforeTaxLakhs > 0 && metrics.currentTaxLakhs === 0} />
        <Metric label="Capital + Reserves"  value={fmtLakhs((metrics.paidUpCapitalLakhs || 0) + (metrics.reservesLakhs || 0))} />
        <Metric label="Borrowings"          value={fmtLakhs(metrics.totalBorrowingsLakhs)} />
        <Metric label="PPE"                 value={fmtLakhs(metrics.fixedAssetsLakhs)}
          alert={metrics.fixedAssetsLakhs === 0} />
      </div>
    </div>
  );
}

// ── Tab button ───────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children, count }) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      style={{
        padding: '12px 18px', background: 'transparent', border: 'none',
        borderBottom: active ? `2px solid ${COLORS.PRIMARY}` : '2px solid transparent',
        marginBottom: -1, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 13, fontFamily: FONTS.BODY,
        color: active ? COLORS.PRIMARY : COLORS.TEXT_MUTED,
        fontWeight: active ? 600 : 500, transition: 'color 150ms',
      }}
    >
      {children}
      {count !== undefined && (
        <span style={{
          background: active ? COLORS.PRIMARY : COLORS.BG_CREAM,
          color:      active ? '#faf6ee'      : COLORS.TEXT_MUTED,
          padding: '1px 7px', borderRadius: 999, fontSize: 11,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function ScheduleIIIReviewer() {
  // ── Settings / API key ──
  const [apiKey,      setApiKey]      = useState(() => getApiKey() || '');
  const [settings,    setSettings]    = useState(() => getSettings());
  const [showSettings, setShowSettings] = useState(false);

  // ── Upload phase ──
  const [file,     setFile]     = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');

  // ── Extract phase ──
  const [phase,        setPhase]        = useState('upload');
  const [markdown,     setMarkdown]     = useState('');
  const [pdfMeta,      setPdfMeta]      = useState(null);
  const [extractError, setExtractError] = useState('');

  // ── Analysis ──
  const [analysis,    setAnalysis]    = useState(null);
  const [caro,        setCaro]        = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const [tokenUsage,  setTokenUsage]  = useState({ sch3: null, caro: null });
  const abortRef = useRef(null);

  // ── Results ──
  const [tab,          setTab]         = useState('issues');
  const [reportFields, setReportFields] = useState({ ...DEFAULT_REPORT_FIELDS });
  const [exporting,    setExporting]   = useState(false);

  // ── Import ref (hidden input for engagement JSON) ──
  const importRef = useRef(null);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'e' && phase === 'done') {
        e.preventDefault();
        handleExportExcel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, analysis, caro, reportFields]);

  // ── Sync firm defaults into report fields when settings change ──
  useEffect(() => {
    setReportFields((prev) => ({
      ...prev,
      firmName:    settings.firmName    || prev.firmName,
      firmFRN:     settings.firmFRN     || prev.firmFRN,
      partnerName: settings.partnerName || prev.partnerName,
      membershipNo:settings.membershipNo || prev.membershipNo,
      place:       settings.place       || prev.place,
    }));
  }, [settings]);

  // ════════════════════════════════════════════════════
  // FILE HANDLING
  // ════════════════════════════════════════════════════
  const handleFile = useCallback((f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setFileError('Please upload a PDF file (.pdf)');
      return;
    }
    if (f.size > 30 * 1024 * 1024) {
      setFileError('PDF too large (> 30 MB). Please compress and retry.');
      return;
    }
    setFile(f);
    setFileError('');
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  // ════════════════════════════════════════════════════
  // EXTRACT → PREVIEW
  // ════════════════════════════════════════════════════
  const runExtract = async (f = file) => {
    if (!f) return;
    setPhase('extracting');
    setExtractError('');
    try {
      const buf = await f.arrayBuffer();
      const result = await extractPdfToMarkdown(buf, {
        onProgress: (pct) => {
          // could wire to a progress bar later
        },
      });
      setMarkdown(result.markdown);
      setPdfMeta({ pageCount: result.pageCount, charCount: result.charCount, looksScanned: result.looksScanned });
      setPhase('preview');
    } catch (err) {
      console.error('PDF extract failed:', err);
      setExtractError(err.message || 'Failed to extract text from PDF.');
      setPhase('upload');
    }
  };

  // ════════════════════════════════════════════════════
  // ANALYSIS (SCH3 → CARO)
  // ════════════════════════════════════════════════════
  const runAnalysis = async (mdText) => {
    if (!mdText?.trim()) return;
    setAnalysisError('');

    // Fresh AbortController for this run
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      // ── Phase 1: Schedule III ──────────────────────────────────────────
      setPhase('analyzing-sch3');
      setTokenUsage({ sch3: null, caro: null });

      const sch3 = await callDeepSeek({
        apiKey,
        model:        settings.model,
        systemPrompt: 'You are a senior Chartered Accountant reviewing Indian company financial statements for Schedule III compliance.',
        userPrompt:   `${mdText}\n\n${SCH3_PROMPT}`,
        signal:       ctrl.signal,
        onUsage:      (u) => setTokenUsage((prev) => ({ ...prev, sch3: u })),
      });
      setAnalysis(sch3);

      // ── Phase 2: CARO ──────────────────────────────────────────────────
      setPhase('analyzing-caro');

      const caroJson = await callDeepSeek({
        apiKey,
        model:        settings.model,
        systemPrompt: 'You are a senior Chartered Accountant applying CARO 2020 to Indian companies.',
        userPrompt:   CARO_PROMPT(
          sch3.keyMetrics,
          sch3.company?.name,
          sch3.company?.isFirstYear,
          sch3.company?.natureOfBusiness,
        ),
        signal:       ctrl.signal,
        onUsage:      (u) => setTokenUsage((prev) => ({ ...prev, caro: u })),
      });

      // Merge ICAI standard wording with AI-flagged review status
      const statusMap = new Map();
      (caroJson.clauseStatus || []).forEach((s) => statusMap.set(s.paragraph, s));

      const mergedClauses = caroJson.applicability?.applies
        ? STANDARD_CARO_REMARKS.map((std) => {
            const status = statusMap.get(std.paragraph) || { needsReview: false, reviewNote: '' };
            return {
              paragraph:     std.paragraph,
              topic:         std.topic,
              applicability: status.needsReview ? 'Review' : 'Standard',
              needsReview:   !!status.needsReview,
              reviewNote:    status.reviewNote || '',
              remark:        std.standard,
              edited:        false,
            };
          })
        : [];

      const finalCaro = { applicability: caroJson.applicability, clauses: mergedClauses };
      setCaro(finalCaro);

      // ── Auto-save engagement ───────────────────────────────────────────
      saveEngagement({ analysis: sch3, caro: finalCaro, reportFields });

      setPhase('done');
      setTab('issues');
    } catch (err) {
      if (err.name === 'AbortError') {
        // User cancelled — go back to preview
        setPhase('preview');
        return;
      }
      console.error('Analysis failed:', err);
      let msg = err.message || 'Analysis failed.';
      if (err instanceof AuthError)     msg = 'Invalid DeepSeek API key. Please check your key in Settings.';
      if (err instanceof RateLimitError) msg = 'DeepSeek rate limit hit. Please wait a moment and try again.';
      setAnalysisError(msg);
      setPhase('error');
    }
  };

  const cancelAnalysis = () => {
    abortRef.current?.abort();
  };

  // ════════════════════════════════════════════════════
  // CARO CLAUSE EDITS
  // ════════════════════════════════════════════════════
  const updateCaroClause = (paragraph, newRemark) =>
    setCaro((prev) => prev ? {
      ...prev,
      clauses: prev.clauses.map((c) =>
        c.paragraph === paragraph ? { ...c, remark: newRemark, edited: true } : c
      ),
    } : prev);

  const resetCaroClause = (paragraph) => {
    const std = STANDARD_CARO_REMARKS.find((s) => s.paragraph === paragraph);
    if (!std) return;
    setCaro((prev) => prev ? {
      ...prev,
      clauses: prev.clauses.map((c) =>
        c.paragraph === paragraph ? { ...c, remark: std.standard, edited: false } : c
      ),
    } : prev);
  };

  // ════════════════════════════════════════════════════
  // EXPORTS
  // ════════════════════════════════════════════════════
  const handleExportExcel = async () => {
    if (!analysis || exporting) return;
    setExporting(true);
    try {
      await exportExcel({ analysis, caro, reportFields });
    } catch (err) {
      console.error('Excel export failed:', err);
      alert('Excel export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const handleGenerateWord = () => {
    if (!analysis) return;
    const ifcofrApplies = (analysis.keyMetrics?.revenueLakhs || 0) >= 5000;
    const html = generateReport(analysis, caro, reportFields, ifcofrApplies);
    const safeName = (analysis.company?.name || 'Company').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 40);
    downloadAsWord(html, `${safeName}_Independent_Auditors_Report.doc`);
  };

  // ════════════════════════════════════════════════════
  // ENGAGEMENT SAVE / LOAD / EXPORT / IMPORT
  // ════════════════════════════════════════════════════
  const handleExportEngagement = () => {
    if (!analysis) return;
    exportEngagement({ analysis, caro, reportFields });
  };

  const handleImportEngagement = async (f) => {
    try {
      const eng = await importEngagement(f);
      applyEngagement(eng);
    } catch (err) {
      alert('Could not import engagement: ' + (err.message || 'Invalid file'));
    }
  };

  const handleLoadEngagement = (eng) => {
    const full = loadEngagement(eng.id);
    if (full) applyEngagement(full);
  };

  const applyEngagement = (eng) => {
    // loadEngagement returns a list entry with { data: {analysis,caro,reportFields} }
    // importEngagement returns { analysis, caro, reportFields } directly (version 1 format)
    const analysis    = eng.data?.analysis    ?? eng.analysis;
    const caro        = eng.data?.caro        ?? eng.caro        ?? null;
    const reportFields = eng.data?.reportFields ?? eng.reportFields ?? { ...DEFAULT_REPORT_FIELDS };
    if (!analysis) return;
    setAnalysis(analysis);
    setCaro(caro);
    setReportFields(reportFields);
    setPhase('done');
    setTab('issues');
    setMarkdown('');
    setFile(null);
  };

  // ════════════════════════════════════════════════════
  // RESET
  // ════════════════════════════════════════════════════
  const handleReset = () => {
    setFile(null); setMarkdown(''); setPdfMeta(null);
    setAnalysis(null); setCaro(null);
    setPhase('upload');
    setFileError(''); setExtractError(''); setAnalysisError('');
    setReportFields({ ...DEFAULT_REPORT_FIELDS });
    setTokenUsage({ sch3: null, caro: null });
    setTab('issues');
  };

  // ════════════════════════════════════════════════════
  // DERIVED VALUES
  // ════════════════════════════════════════════════════
  function buildCounts(issues) {
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    issues.forEach((i) => { if (c[i.severity] !== undefined) c[i.severity]++; });
    return c;
  }

  const counts       = analysis ? buildCounts(analysis.scheduleIIIIssues || []) : { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  const issuesSorted = analysis
    ? [...(analysis.scheduleIIIIssues || [])].sort((a, b) => (SEVERITY[a.severity]?.rank ?? 9) - (SEVERITY[b.severity]?.rank ?? 9))
    : [];

  // ════════════════════════════════════════════════════
  // FIRST-RUN GATE
  // ════════════════════════════════════════════════════
  if (!apiKey) {
    return (
      <SettingsGate
        onUnlock={(key) => {
          setApiKey(key);
          setSettings(getSettings());
        }}
      />
    );
  }

  // ════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', background: COLORS.BG, fontFamily: FONTS.BODY }}>

      {/* Header */}
      <EngagementHeader
        settings={settings}
        phase={phase}
        exporting={exporting}
        tokenUsage={tokenUsage}
        onSettingsClick={() => setShowSettings(true)}
        onReset={handleReset}
        onExportExcel={handleExportExcel}
        onExportEngagement={handleExportEngagement}
        onImportEngagement={handleImportEngagement}
        onLoadEngagement={handleLoadEngagement}
      />

      {/* Settings slide-in */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          apiKey={apiKey}
          onSettingsChange={(s) => { setSettings(s); }}
          onApiKeyChange={(k) => setApiKey(k)}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Main content */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 32px 80px' }}>

        {/* ── UPLOAD ── */}
        {phase === 'upload' && (
          <FileUpload
            file={file}
            dragOver={dragOver}
            error={fileError || extractError}
            onFile={handleFile}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onAnalyze={() => runExtract()}
          />
        )}

        {/* ── EXTRACTING ── */}
        {phase === 'extracting' && (
          <div className="fade-in" style={{ maxWidth: 480, margin: '120px auto', textAlign: 'center' }}>
            <div className="pulse-dot" style={{
              width: 56, height: 56, borderRadius: '50%', background: COLORS.PRIMARY,
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#faf6ee" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <h2 className="serif" style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, color: COLORS.TEXT }}>
              Extracting text…
            </h2>
            <p style={{ color: COLORS.TEXT_MUTED, fontSize: 14 }}>
              Running pdfjs · page-by-page extraction
            </p>
          </div>
        )}

        {/* ── PREVIEW ── */}
        {phase === 'preview' && (
          <PdfMarkdownPreview
            markdown={markdown}
            pdfMeta={pdfMeta}
            onMarkdownChange={setMarkdown}
            onReExtract={() => runExtract()}
            onAnalyze={(md) => runAnalysis(md)}
          />
        )}

        {/* ── ANALYZING ── */}
        {(phase === 'analyzing-sch3' || phase === 'analyzing-caro') && (
          <AnalyzingProgress phase={phase} onCancel={cancelAnalysis} />
        )}

        {/* ── ERROR ── */}
        {phase === 'error' && (
          <div className="fade-in" style={{ maxWidth: 560, margin: '80px auto 0', textAlign: 'center' }}>
            <XCircle size={40} color={COLORS.CRIT} style={{ marginBottom: 16 }} />
            <h2 className="serif" style={{ fontSize: 24, marginBottom: 10, color: COLORS.TEXT }}>
              Couldn't complete the review
            </h2>
            <p style={{ color: COLORS.TEXT_MUTED, marginBottom: 24, fontSize: 14 }}>
              {analysisError}
            </p>
            <button onClick={() => setPhase('preview')} style={{ ...BTN_PRIMARY, marginRight: 10 }}>
              Back to preview
            </button>
            <button onClick={handleReset} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: `1px solid ${COLORS.BORDER_STRONG}`,
              padding: '9px 18px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
              fontFamily: FONTS.BODY, color: COLORS.TEXT,
            }}>
              <RotateCcw size={14} /> Start over
            </button>
          </div>
        )}

        {/* ── DONE ── */}
        {phase === 'done' && analysis && (
          <div className="fade-in">
            <CompanyHeader
              company={analysis.company || {}}
              metrics={analysis.keyMetrics || {}}
              counts={counts}
              caroApplies={caro?.applicability?.applies}
            />

            {/* Tab bar */}
            <div role="tablist" style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${COLORS.BORDER}`, marginBottom: 24 }}>
              <TabBtn active={tab === 'issues'} onClick={() => setTab('issues')} count={issuesSorted.length}>
                <Layers size={14} /> Schedule III Issues
              </TabBtn>
              <TabBtn active={tab === 'caro'} onClick={() => setTab('caro')}>
                <ShieldCheck size={14} /> CARO 2020 Applicability
              </TabBtn>
              {caro?.applicability?.applies && caro.clauses?.length > 0 && (
                <TabBtn active={tab === 'clauses'} onClick={() => setTab('clauses')} count={caro.clauses.length}>
                  <Hash size={14} /> CARO Clauses
                </TabBtn>
              )}
              <TabBtn active={tab === 'audit-report'} onClick={() => setTab('audit-report')}>
                <FileSignature size={14} /> Audit Report
              </TabBtn>
            </div>

            {/* Issues tab */}
            {tab === 'issues' && (
              <div className="fade-in">
                <SeveritySummary counts={counts} />
                {issuesSorted.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '48px 24px',
                    color: COLORS.TEXT_MUTED, fontSize: 14,
                  }}>
                    No Schedule III issues flagged. ✓
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {issuesSorted.map((iss, idx) => (
                      <IssueCard key={iss.id || idx} issue={iss} index={idx + 1} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CARO applicability tab */}
            {tab === 'caro' && caro && (
              <CaroApplicabilityView app={caro.applicability} />
            )}

            {/* CARO clauses tab */}
            {tab === 'clauses' && caro?.clauses && (
              <div className="fade-in">
                <div style={{
                  background: '#fef9f1', border: `1px solid ${COLORS.BORDER}`,
                  borderRadius: 8, padding: '12px 16px', marginBottom: 16,
                }}>
                  <div style={{ fontSize: 13, color: COLORS.TEXT, lineHeight: 1.5 }}>
                    <strong style={{ color: COLORS.PRIMARY }}>Standard ICAI illustrative wording</strong> shown for each of the 21 paragraphs.
                    Click any clause to expand and edit before exporting. Items flagged{' '}
                    <span style={{ color: COLORS.HIGH, fontWeight: 600 }}>"Review"</span> contain a fact-pattern that contradicts the default — edit those before exporting Annexure A.
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {caro.clauses.map((c, i) => (
                    <ClauseRow
                      key={c.paragraph + i}
                      clause={c}
                      onUpdate={updateCaroClause}
                      onReset={resetCaroClause}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Audit report tab */}
            {tab === 'audit-report' && (
              <AuditReportTab
                analysis={analysis}
                caro={caro}
                reportFields={reportFields}
                setReportFields={setReportFields}
                onGenerate={handleGenerateWord}
              />
            )}
          </div>
        )}
      </main>

      <footer style={{
        borderTop: `1px solid ${COLORS.BORDER}`, marginTop: 80,
        padding: '24px 32px', textAlign: 'center',
        fontSize: 11, color: COLORS.TEXT_MUTED,
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        AI-assisted review · Always verify findings against the underlying records
      </footer>
    </div>
  );
}
