import React from 'react';
import { BTN_PRIMARY, BTN_GHOST, BTN_DANGER } from '../../styles/tokens.js';

export function Button({ variant = 'primary', onClick, disabled, style, children, ...rest }) {
  const base = variant === 'ghost' ? BTN_GHOST : variant === 'danger' ? BTN_DANGER : BTN_PRIMARY;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer', ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
