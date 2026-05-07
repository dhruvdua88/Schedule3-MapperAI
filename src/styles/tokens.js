// ============ DESIGN TOKENS ============
// Single source of truth for all colours, typography, and shared style objects.
// Matches the original artifact exactly — do not change these values.

import { AlertCircle, AlertTriangle, Hash, CheckCircle2 } from 'lucide-react';

export const COLORS = {
  BG:            '#faf6ee',
  BG_CARD:       '#fffdf7',
  BG_CREAM:      '#fef9f1',
  BG_BAND:       '#fdf9ef',
  BORDER:        '#e8e1d2',
  BORDER_STRONG: '#d4cab4',
  PRIMARY:       '#1a3d2e',
  TEXT:          '#1c1f1c',
  TEXT_MUTED:    '#5c5e58',
  TEXT_FAINT:    '#a39d8c',
  // Severity palette
  CRIT:    '#9a2920', CRIT_BG:  '#fdf3f0',
  HIGH:    '#a85d1a', HIGH_BG:  '#fdf6ed',
  MED:     '#8c721b', MED_BG:   '#fbf8ed',
  LOW:     '#3e6034', LOW_BG:   '#f4f7ee',
};

export const SEVERITY = {
  CRITICAL: {
    label: 'Critical',
    bar:      COLORS.CRIT,
    bg:       COLORS.CRIT_BG,
    chipBg:   COLORS.CRIT,
    chipText: '#fef9f1',
    icon:     AlertCircle,
    rank: 0,
  },
  HIGH: {
    label: 'High',
    bar:      COLORS.HIGH,
    bg:       COLORS.HIGH_BG,
    chipBg:   COLORS.HIGH,
    chipText: '#fef9f1',
    icon:     AlertTriangle,
    rank: 1,
  },
  MEDIUM: {
    label: 'Medium',
    bar:      COLORS.MED,
    bg:       COLORS.MED_BG,
    chipBg:   COLORS.MED,
    chipText: '#fef9f1',
    icon:     Hash,
    rank: 2,
  },
  LOW: {
    label: 'Low',
    bar:      COLORS.LOW,
    bg:       COLORS.LOW_BG,
    chipBg:   COLORS.LOW,
    chipText: '#fef9f1',
    icon:     CheckCircle2,
    rank: 3,
  },
};

export const FONTS = {
  BODY:  "'IBM Plex Sans', sans-serif",
  SERIF: "'Fraunces', serif",
  MONO:  "'JetBrains Mono', monospace",
};

// ---- Shared button style objects ----
export const BTN_PRIMARY = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  background: COLORS.PRIMARY, color: '#faf6ee', border: 'none',
  padding: '9px 18px', borderRadius: 6, fontSize: 13, fontWeight: 500,
  cursor: 'pointer', fontFamily: FONTS.BODY,
};

export const BTN_GHOST = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'transparent', color: COLORS.TEXT,
  border: `1px solid ${COLORS.BORDER_STRONG}`,
  padding: '9px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500,
  cursor: 'pointer', fontFamily: FONTS.BODY,
};

export const BTN_DANGER = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'transparent', color: COLORS.CRIT,
  border: `1px solid ${COLORS.CRIT}`,
  padding: '9px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500,
  cursor: 'pointer', fontFamily: FONTS.BODY,
};

// ---- Table primitives ----
export const TH_STYLE = {
  textAlign: 'left', padding: '12px 20px', fontSize: 11,
  textTransform: 'uppercase', letterSpacing: '0.08em',
  color: COLORS.TEXT_MUTED, fontWeight: 600,
  borderBottom: `1px solid ${COLORS.BORDER}`,
};

export const TD_STYLE = {
  padding: '14px 20px', fontSize: 13, color: COLORS.TEXT,
};
