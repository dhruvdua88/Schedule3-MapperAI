// ============ AUDIT REPORT TAB ============
// SA 700 (Revised) compliant Independent Auditor's Report builder.
// Handles CARO Annexure A and IFCoFR Annexure B applicability.

import React from 'react';
import {
  ShieldCheck, FileCheck2, Stamp, Edit3, Download, Check,
} from 'lucide-react';
import { COLORS, FONTS, BTN_PRIMARY } from '../styles/tokens.js';

// ── Sub-components ──────────────────────────────────────────────────────────

function ApplicabilityCard({ icon: Icon, title, status, color, subnote }) {
  return (
    <div style={{
      background: '#fffdf7', border: '1px solid #e8e1d2',
      borderLeft: `3px solid ${color}`, borderRadius: 8, padding: '14px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Icon size={15} color={color} />
        <div style={{ fontSize: 11, color: COLORS.TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          {title}
        </div>
      </div>
      <div style={{ fontSize: 13, color: COLORS.TEXT, fontWeight: 500 }}>{status}</div>
      {subnote && <div style={{ fontSize: 11, color: COLORS.TEXT_MUTED, marginTop: 4, fontStyle: 'italic' }}>{subnote}</div>}
    </div>
  );
}

function SectionCard({ icon: Icon, title, subtitle, children, accent }) {
  return (
    <div style={{
      background: '#fffdf7',
      border: accent ? `1px solid #e8e1d2` : `1px solid #e8e1d2`,
      borderLeft: accent ? `3px solid ${accent}` : `1px solid #e8e1d2`,
      borderRadius: 10, padding: 20, marginBottom: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <Icon size={16} color={COLORS.PRIMARY} />
        <div className="serif" style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
      </div>
      {subtitle && <div style={{ fontSize: 12, color: COLORS.TEXT_MUTED, marginBottom: 16 }}>{subtitle}</div>}
      {children}
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', mono = false, placeholder, readOnly }) {
  return (
    <div>
      <label style={{
        fontSize: 10, color: COLORS.TEXT_MUTED, textTransform: 'uppercase',
        letterSpacing: '0.08em', fontWeight: 600, display: 'block', marginBottom: 4,
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{
          width: '100%', padding: '8px 10px',
          background: readOnly ? COLORS.BG_CREAM : '#fef9f1',
          border: `1px solid ${COLORS.BORDER_STRONG}`,
          borderRadius: 5, fontSize: 13,
          fontFamily: mono ? FONTS.MONO : FONTS.BODY,
          color: COLORS.TEXT, boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

function Rule11Item({ letter, label, value, onChange, readOnly, reviewed, onToggleReview, extra }) {
  return (
    <div style={{
      borderTop: `1px solid #f0ead8`, paddingTop: 14, marginTop: 14,
      display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'flex-start',
    }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.PRIMARY, marginBottom: 6 }}>
          <span className="mono" style={{ marginRight: 6 }}>{letter}</span>
          {label}
        </div>
        {extra && <div style={{ marginBottom: 10 }}>{extra}</div>}
        {readOnly ? (
          <div style={{
            fontSize: 12, color: COLORS.TEXT_MUTED, fontStyle: 'italic', lineHeight: 1.5,
            padding: '8px 10px', background: '#fbf8ed', borderRadius: 5, border: '1px dashed #d4cab4',
          }}>
            {value}
          </div>
        ) : (
          <textarea
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            rows={3}
            style={{
              width: '100%', padding: '8px 10px',
              background: '#fef9f1', border: `1px solid ${COLORS.BORDER_STRONG}`,
              borderRadius: 5, fontSize: 12, fontFamily: FONTS.BODY,
              color: COLORS.TEXT, lineHeight: 1.5, resize: 'vertical', boxSizing: 'border-box',
            }}
          />
        )}
      </div>
      <button
        onClick={onToggleReview}
        style={{
          background:  reviewed ? '#3e6034' : '#fef9f1',
          color:       reviewed ? '#faf6ee' : COLORS.HIGH,
          border:      `1px solid ${reviewed ? '#3e6034' : COLORS.HIGH}`,
          padding: '5px 11px', borderRadius: 4, fontSize: 10, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          whiteSpace: 'nowrap', fontFamily: FONTS.BODY,
        }}
      >
        {reviewed ? <><Check size={11} /> Reviewed</> : 'Review required'}
      </button>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function AuditReportTab({ analysis, caro, reportFields: rf, setReportFields, onGenerate }) {
  const ifcofrApplies = (analysis?.keyMetrics?.revenueLakhs || 0) >= 5000;
  const caroApplies   = !!caro?.applicability?.applies;
  const allReviewed   = rf.reviewed ? Object.values(rf.reviewed).every(Boolean) : false;

  const update       = (key, val) => setReportFields({ ...rf, [key]: val });
  const toggleReview = (k) => setReportFields({ ...rf, reviewed: { ...rf.reviewed, [k]: !rf.reviewed[k] } });

  return (
    <div className="fade-in">

      {/* Applicability strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
        <ApplicabilityCard
          icon={ShieldCheck}
          title="CARO 2020"
          status={caroApplies ? 'Applies — Annexure A will be attached' : 'Does not apply — no Annexure A'}
          color={caroApplies ? COLORS.HIGH : '#3e6034'}
        />
        <ApplicabilityCard
          icon={FileCheck2}
          title="IFCoFR — Sec 143(3)(i)"
          status={ifcofrApplies
            ? 'Applies — Annexure B will be attached'
            : `Exempt — turnover Rs ${((analysis?.keyMetrics?.revenueLakhs || 0) / 100).toFixed(2)} cr < Rs 50 cr`}
          color={ifcofrApplies ? COLORS.HIGH : '#3e6034'}
          subnote={!ifcofrApplies ? 'Turnover-only test applied (per practice convention)' : null}
        />
      </div>

      {/* Signature block */}
      <SectionCard icon={Stamp} title="Signature block" subtitle="Pre-filled with firm defaults; edit per engagement">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <InputField label="Firm name"                value={rf.firmName}            onChange={(v) => update('firmName', v)} />
          <InputField label="Firm Registration No (FRN)" value={rf.firmFRN}          onChange={(v) => update('firmFRN', v)} mono />
          <InputField label="Partner / Signatory name" value={rf.partnerName}         onChange={(v) => update('partnerName', v)} />
          <InputField label="Designation"              value={rf.partnerDesignation}  onChange={(v) => update('partnerDesignation', v)} />
          <InputField label="Membership Number"        value={rf.membershipNo}        onChange={(v) => update('membershipNo', v)} mono />
          <InputField label="UDIN"                     value={rf.udin}                onChange={(v) => update('udin', v)} mono placeholder="Enter at signing" />
          <InputField label="Place"                    value={rf.place}               onChange={(v) => update('place', v)} />
          <InputField label="Date of report"           value={rf.reportDate}          onChange={(v) => update('reportDate', v)} type="date" mono />
        </div>
      </SectionCard>

      {/* Rule 11 disclosures */}
      <SectionCard
        icon={Edit3}
        title="Rule 11 disclosures"
        subtitle="Clean defaults shown — review each item and confirm before generating"
        accent={!allReviewed ? COLORS.HIGH : '#3e6034'}
      >
        <Rule11Item
          letter="(a)" label="Pending litigations [Rule 11(a)]"
          value={rf.rule11a_litigation}
          onChange={(v) => update('rule11a_litigation', v)}
          reviewed={rf.reviewed?.a}
          onToggleReview={() => toggleReview('a')}
        />
        <Rule11Item
          letter="(b)" label="Long-term contracts incl. derivatives [Rule 11(b)]"
          value={rf.rule11b_longTermContracts}
          onChange={(v) => update('rule11b_longTermContracts', v)}
          reviewed={rf.reviewed?.b}
          onToggleReview={() => toggleReview('b')}
        />
        <Rule11Item
          letter="(c)" label="Investor Education and Protection Fund [Rule 11(c)]"
          value={rf.rule11c_iepf}
          onChange={(v) => update('rule11c_iepf', v)}
          reviewed={rf.reviewed?.c}
          onToggleReview={() => toggleReview('c')}
        />
        <Rule11Item
          letter="(e)" label="Ultimate Beneficiary [Rule 11(e)] — three-part standard wording"
          value="Standard three-part Ultimate Beneficiary representation (auto-included with funds advanced + funds received + audit-procedure conclusion). Edit only if material exceptions exist."
          readOnly
          reviewed={rf.reviewed?.e}
          onToggleReview={() => toggleReview('e')}
        />
        <Rule11Item
          letter="(f)" label="Dividend declared/paid u/s 123 [Rule 11(f)]"
          value={rf.rule11f_dividend}
          onChange={(v) => update('rule11f_dividend', v)}
          reviewed={rf.reviewed?.f}
          onToggleReview={() => toggleReview('f')}
        />
        <Rule11Item
          letter="(g)" label="Audit trail / accounting software [Rule 11(g)] — per ICAI Implementation Guide Revised 2024"
          extra={
            <InputField label="Accounting software name" value={rf.accountingSoftware} onChange={(v) => update('accountingSoftware', v)} />
          }
          value="Standard unmodified wording: software has audit-trail feature, operated throughout the year, no tampering observed. Edit the software name above; modify clause only on adverse finding."
          readOnly
          reviewed={rf.reviewed?.g}
          onToggleReview={() => toggleReview('g')}
        />
      </SectionCard>

      {/* Generate button */}
      <div style={{
        marginTop: 28, padding: 20, background: '#fffdf7', border: '1px solid #e8e1d2',
        borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div>
          <div className="serif" style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>
            Ready to generate the Independent Auditor's Report
          </div>
          <div style={{ fontSize: 12, color: COLORS.TEXT_MUTED }}>
            SA 700 (Revised) compliant ·{' '}
            {caroApplies  && 'with Annexure A (CARO 2020)'}
            {caroApplies  && ifcofrApplies && ' and '}
            {ifcofrApplies && 'Annexure B (IFCoFR long-form)'}
            {!caroApplies && !ifcofrApplies && 'main report only'}
            {!allReviewed && (
              <span style={{ color: COLORS.HIGH, fontWeight: 600 }}>
                {' '}· {Object.values(rf.reviewed || {}).filter((x) => !x).length} Rule 11 item(s) still need review
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onGenerate}
          style={{ ...BTN_PRIMARY, padding: '12px 22px', fontSize: 14, opacity: allReviewed ? 1 : 0.7 }}
        >
          <Download size={15} /> Generate Word Report
        </button>
      </div>

      <p style={{ fontSize: 11, color: '#a39d8c', textAlign: 'center', marginTop: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Output is a .doc file · opens cleanly in Microsoft Word and Google Docs
      </p>
    </div>
  );
}
