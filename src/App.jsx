import React, { useState } from 'react';
import { FileSearch, Layers } from 'lucide-react';
import { ScheduleIIIReviewer } from './components/ScheduleIIIReviewer.jsx';
import { GroupingMapper } from './components/GroupingMapper.jsx';
import { COLORS, FONTS } from './styles/tokens.js';

// Two top-level modes. The Reviewer runs the PDF/Excel audit phase-machine;
// the Grouping Mapper is a self-contained trial-balance → Schedule III grouping
// tool. Mode is the only shared state — each mode owns everything else.
const MODES = [
  { key: 'reviewer', label: 'Schedule III Reviewer', icon: FileSearch },
  { key: 'mapper',   label: 'Grouping Mapper',       icon: Layers },
];

export default function App() {
  const [mode, setMode] = useState('reviewer');

  return (
    <div style={{ minHeight: '100vh', background: COLORS.BG }}>
      <nav style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 20px', borderBottom: `1px solid ${COLORS.BORDER}`,
        background: COLORS.BG_CARD, position: 'sticky', top: 0, zIndex: 50,
      }}>
        <span style={{ fontFamily: FONTS.SERIF, fontWeight: 600, fontSize: 14, color: COLORS.PRIMARY, marginRight: 10 }}>
          Schedule III&nbsp;·&nbsp;MapperAI
        </span>
        {MODES.map(({ key, label, icon: Icon }) => {
          const active = mode === key;
          return (
            <button
              key={key}
              onClick={() => setMode(key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '7px 14px', borderRadius: 7, cursor: 'pointer',
                fontSize: 13, fontFamily: FONTS.BODY, fontWeight: active ? 600 : 500,
                border: `1px solid ${active ? COLORS.PRIMARY : 'transparent'}`,
                background: active ? COLORS.PRIMARY : 'transparent',
                color: active ? '#faf6ee' : COLORS.TEXT_MUTED,
              }}
            >
              <Icon size={15} /> {label}
            </button>
          );
        })}
      </nav>

      {mode === 'reviewer' ? <ScheduleIIIReviewer /> : <GroupingMapper />}
    </div>
  );
}
