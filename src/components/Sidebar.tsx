/**
 * Sidebar.tsx — Academic Panel displaying the formal 5-tuple definition
 * and simulation trace table.
 * 
 * Contains:
 *   - KaTeX-rendered formal definition: M = (Q, Σ, δ, q₀, F)
 *   - Automaton type badge (DFA / NFA / ε-NFA)
 *   - Transition list with delete capability
 *   - Simulation trace table showing step-by-step execution
 *   - Preset loader cards
 */

import React, { useRef, useEffect } from 'react';
import katex from 'katex';
import {
  BookOpen,
  Table2,
  Layers,
  ArrowRightLeft,
  Sparkles,
  Trash2,
  X,
  Undo,
  Regex,
  Zap,
  CheckCircle,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import type {
  StateNode,
  TransitionEntry,
  AutomatonType,
  AlphabetSymbol,
  SimulationResult,
  SimulationStep,
} from '../core/types';
import type { AutomatonPreset } from '../core/types';
import { EPSILON } from '../core/types';
import { PRESETS } from '../core/presets';

interface SidebarProps {
  states: StateNode[];
  transitions: TransitionEntry[];
  startStateId: string | null;
  acceptingStateIds: Set<string>;
  automatonType: AutomatonType;
  alphabet: AlphabetSymbol[];
  simulationResult: SimulationResult | null;
  currentStepIndex: number;
  onLoadPreset: (preset: AutomatonPreset) => void;
  onAddTransitionClick: () => void;
  onRemoveTransition: (id: string) => void;
  onUndoAction: () => void;
  onClearAll: () => void;
  // Regex mode props
  regexMode: boolean;
  regexPattern: string;
  regexError?: string;
  regexParsed: string;
  onToggleRegexMode: () => void;
  onRegexPatternChange: (pattern: string) => void;
  onCompileRegex: () => void;
  onCompileRegexDFA: () => void;
}

/**
 * KaTeX rendering helper — renders a LaTeX string into an HTML element.
 */
function KaTeXBlock({ latex }: { latex: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(latex, ref.current, {
          throwOnError: false,
          displayMode: false,
          trust: true,
        });
      } catch {
        if (ref.current) {
          ref.current.textContent = latex;
        }
      }
    }
  }, [latex]);

  return <span ref={ref} />;
}

export const Sidebar: React.FC<SidebarProps> = ({
  states,
  transitions,
  startStateId,
  acceptingStateIds,
  automatonType,
  alphabet,
  simulationResult,
  currentStepIndex,
  onLoadPreset,
  onAddTransitionClick,
  onRemoveTransition,
  onUndoAction,
  onClearAll,
  regexMode,
  regexPattern,
  regexError,
  regexParsed,
  onToggleRegexMode,
  onRegexPatternChange,
  onCompileRegex,
  onCompileRegexDFA,
}) => {
  // Build the formal definition strings
  const stateLabels = states.map((s) => s.label);
  const startLabel = states.find((s) => s.id === startStateId)?.label ?? '\\text{—}';
  const acceptLabels = states
    .filter((s) => acceptingStateIds.has(s.id))
    .map((s) => s.label);

  // Q set
  const qLatex =
    stateLabels.length > 0
      ? `Q = \\{${stateLabels.join(',\\, ')}\\}`
      : 'Q = \\emptyset';

  // Σ alphabet
  const sigmaLatex =
    alphabet.length > 0
      ? `\\Sigma = \\{${alphabet.join(',\\, ')}\\}`
      : '\\Sigma = \\emptyset';

  // q₀ start state
  const q0Latex = `q_0 = ${startLabel}`;

  // F accepting states
  const fLatex =
    acceptLabels.length > 0
      ? `F = \\{${acceptLabels.join(',\\, ')}\\}`
      : 'F = \\emptyset';

  // Build state ID → label map for transition display
  const stateIdToLabel: Record<string, string> = {};
  for (const s of states) {
    stateIdToLabel[s.id] = s.label;
  }

  // Group transitions for δ display
  const deltaEntries: string[] = [];
  const groupedTransitions: Record<string, TransitionEntry[]> = {};
  for (const t of transitions) {
    const key = `${t.fromStateId}::${t.toStateId}`;
    if (!groupedTransitions[key]) {
      groupedTransitions[key] = [];
    }
    groupedTransitions[key].push(t);
  }

  for (const [key, group] of Object.entries(groupedTransitions)) {
    const [fromId, toId] = key.split('::');
    const fromLabel = stateIdToLabel[fromId] ?? '?';
    const toLabel = stateIdToLabel[toId] ?? '?';
    const symbols = group.map((t) => t.symbol).join(', ');
    for (const t of group) {
      deltaEntries.push(
        `\\delta(${fromLabel},\\, ${t.symbol === EPSILON ? '\\varepsilon' : t.symbol}) \\ni ${toLabel}`
      );
    }
  }

  return (
    <div className="sidebar-panel">
      {/* ═══ Regex Mode Section ═══ */}
      <div className="sidebar-section regex-section">
        <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Regex size={14} />
            Regular Expression
          </div>
          <button
            className="regex-toggle-btn"
            onClick={onToggleRegexMode}
            title={regexMode ? 'Disable Regex Mode' : 'Enable Regex Mode'}
          >
            {regexMode ? <ToggleRight size={22} color="#db2777" /> : <ToggleLeft size={22} />}
          </button>
        </div>

        {regexMode && (
          <div className="regex-input-area">
            <div className="regex-input-row">
              <input
                type="text"
                className="input-field regex-input"
                placeholder='e.g. (a|b)*abb'
                value={regexPattern}
                onChange={(e) => onRegexPatternChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onCompileRegex();
                }}
                id="regex-input"
              />
            </div>
            <div className="regex-input-row" style={{ marginTop: 8 }}>
              <button
                className="btn btn-primary regex-compile-btn"
                onClick={onCompileRegex}
                disabled={!regexPattern.trim()}
                title="Compile regex to ε-NFA (Thompson's Construction)"
                style={{ flex: 1 }}
              >
                <Sparkles size={14} />
                Build NFA
              </button>
              <button
                className="btn btn-primary regex-compile-btn"
                onClick={onCompileRegexDFA}
                disabled={!regexPattern.trim()}
                title="Compile regex to DFA (Subset Construction)"
                style={{ flex: 1, background: 'linear-gradient(135deg, #db2777 0%, #9333ea 100%)' }}
              >
                <Zap size={14} />
                Build DFA
              </button>
            </div>

            {/* Status indicator */}
            {regexError && (
              <div className="regex-status regex-status-error">
                <AlertCircle size={13} />
                <span>{regexError}</span>
              </div>
            )}
            {regexParsed && !regexError && (
              <div className="regex-status regex-status-success">
                <CheckCircle size={13} />
                <span>Parsed: <code>{regexParsed}</code></span>
              </div>
            )}

            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6, opacity: 0.7 }}>
              Syntax: <code>a|b</code> union · <code>ab</code> concat · <code>a*</code> star · <code>a+</code> one+ · <code>a?</code> opt · <code>()</code> group
            </div>
          </div>
        )}
      </div>

      {/* Automaton Type & Actions */}
      <div className="sidebar-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge badge-type">{automatonType}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {states.length} states · {transitions.length} transitions
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="btn btn-ghost"
            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
            onClick={onUndoAction}
            title="Undo last action"
          >
            <Undo size={13} />
          </button>
          {states.length > 0 && (
            <button
              className="btn btn-ghost"
              style={{ padding: '4px 8px', fontSize: '0.7rem' }}
              onClick={onClearAll}
              title="Clear all"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Formal Definition — M = (Q, Σ, δ, q₀, F) */}
      <div className="sidebar-section">
        <div className="section-title">
          <BookOpen size={14} />
          Formal Definition
        </div>
        <div className="formal-definition">
          <div style={{ marginBottom: 10, opacity: 0.7 }}>
            <KaTeXBlock latex={`M = (Q,\\, \\Sigma,\\, \\delta,\\, q_0,\\, F)`} />
          </div>
          <div className="formal-tuple-line">
            <KaTeXBlock latex={qLatex} />
          </div>
          <div className="formal-tuple-line">
            <KaTeXBlock latex={sigmaLatex} />
          </div>
          <div className="formal-tuple-line">
            <KaTeXBlock latex={q0Latex} />
          </div>
          <div className="formal-tuple-line">
            <KaTeXBlock latex={fLatex} />
          </div>
        </div>
      </div>

      {/* Transition Function δ */}
      <div className="sidebar-section">
        <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowRightLeft size={14} />
            Transition Function δ
          </div>
          <button
            className="btn btn-primary"
            style={{ padding: '4px 12px', fontSize: '0.7rem', height: '24px' }}
            onClick={onAddTransitionClick}
          >
            Add
          </button>
        </div>
        {transitions.length === 0 ? (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Right-click a state → "Add Transition" to define δ
          </div>
        ) : (
          <div style={{ maxHeight: 160, overflowY: 'auto' }}>
            {transitions.map((t) => (
              <div key={t.id} className="transition-item">
                <span>
                  δ({stateIdToLabel[t.fromStateId] ?? '?'},{' '}
                  {t.symbol === EPSILON ? 'ε' : t.symbol}) →{' '}
                  {stateIdToLabel[t.toStateId] ?? '?'}
                </span>
                <button
                  className="delete-btn"
                  onClick={() => onRemoveTransition(t.id)}
                  title="Remove transition"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Simulation Trace Table */}
      {simulationResult && simulationResult.steps.length > 0 && (
        <div className="sidebar-section" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="section-title">
            <Table2 size={14} />
            Simulation Trace
            {simulationResult.completed && (
              <span
                className={`badge ${
                  simulationResult.accepted ? 'badge-accepted' : 'badge-rejected'
                }`}
                style={{ marginLeft: 'auto' }}
              >
                {simulationResult.accepted ? 'ACCEPTED' : 'REJECTED'}
              </span>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table className="trace-table">
              <thead>
                <tr>
                  <th>Step</th>
                  <th>Symbol</th>
                  <th>Active States</th>
                </tr>
              </thead>
              <tbody>
                {simulationResult.steps.map((step, i) => {
                  const activeLabels = states
                    .filter((s) => step.activeStateIds.has(s.id))
                    .map((s) => s.label);

                  return (
                    <tr
                      key={i}
                      className={i === currentStepIndex ? 'active-step' : ''}
                    >
                      <td className="step-number">{step.stepIndex}</td>
                      <td className="symbol-cell">
                        {step.symbolConsumed ?? '—'}
                      </td>
                      <td className="states-cell">
                        {activeLabels.length > 0
                          ? `{${activeLabels.join(', ')}}`
                          : '∅'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Presets */}
      <div className="sidebar-section">
        <div className="section-title">
          <Sparkles size={14} />
          Presets
        </div>
        {PRESETS.map((preset, i) => (
          <div
            key={i}
            className="preset-card"
            onClick={() => onLoadPreset(preset)}
          >
            <div className="preset-name">
              <span className="badge badge-type" style={{ marginRight: 6, fontSize: '0.6rem', padding: '1px 6px' }}>
                {preset.type}
              </span>
              {preset.name}
            </div>
            <div className="preset-desc">{preset.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
