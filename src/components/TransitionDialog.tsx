/**
 * TransitionDialog.tsx — Modal dialog for adding a transition between states.
 * 
 * Allows the user to select:
 *   - Target state (to)
 *   - Transition symbol (from alphabet or custom, including ε)
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { StateNode, AlphabetSymbol } from '../core/types';
import { EPSILON } from '../core/types';

interface TransitionDialogProps {
  fromStateId: string;
  fromStateLabel: string;
  states: StateNode[];
  onAdd: (fromId: string, toId: string, symbol: AlphabetSymbol) => void;
  onClose: () => void;
}

export const TransitionDialog: React.FC<TransitionDialogProps> = ({
  fromStateId,
  fromStateLabel,
  states,
  onAdd,
  onClose,
}) => {
  const [toStateId, setToStateId] = useState(states[0]?.id ?? '');
  const [symbol, setSymbol] = useState('');
  const [useEpsilon, setUseEpsilon] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const finalSymbol = useEpsilon ? EPSILON : symbol.trim();
      if (!finalSymbol || !toStateId) return;
      onAdd(fromStateId, toStateId, finalSymbol);
      onClose();
    },
    [fromStateId, toStateId, symbol, useEpsilon, onAdd, onClose]
  );

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>
          Add Transition from{' '}
          <span style={{ color: 'var(--accent-cyan)' }}>{fromStateLabel}</span>
        </h3>

        <form onSubmit={handleSubmit}>
          {/* Target state selection */}
          <div className="dialog-field">
            <label>Target State</label>
            <select
              value={toStateId}
              onChange={(e) => setToStateId(e.target.value)}
            >
              {states.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                  {s.id === fromStateId ? ' (self-loop)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Symbol input */}
          <div className="dialog-field">
            <label>Symbol</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                ref={inputRef}
                type="text"
                className="input-field"
                placeholder="0, 1, a, b..."
                value={useEpsilon ? 'ε' : symbol}
                onChange={(e) => {
                  setUseEpsilon(false);
                  setSymbol(e.target.value);
                }}
                disabled={useEpsilon}
                maxLength={1}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className={`btn ${useEpsilon ? 'btn-primary' : ''}`}
                onClick={() => setUseEpsilon(!useEpsilon)}
                title="Epsilon (ε) transition"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                ε
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="dialog-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!useEpsilon && !symbol.trim()}
            >
              Add Transition
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
