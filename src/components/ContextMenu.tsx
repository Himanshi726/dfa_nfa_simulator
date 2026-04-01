/**
 * ContextMenu.tsx — Right-click context menu for state actions.
 * 
 * Actions:
 *   - Set as Start State (q₀)
 *   - Toggle Accepting State (∈ F / ∉ F)
 *   - Add Transition (opens TransitionDialog)
 *   - Delete State
 */

import React, { useEffect, useRef } from 'react';
import {
  Play,
  Target,
  ArrowRightLeft,
  Trash2,
} from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  stateId: string;
  stateLabel: string;
  isAccepting: boolean;
  isStart: boolean;
  onClose: () => void;
  onSetStart: (id: string) => void;
  onToggleAccepting: (id: string) => void;
  onAddTransition: (fromId: string) => void;
  onDeleteState: (id: string) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  stateId,
  stateLabel,
  isAccepting,
  isStart,
  onClose,
  onSetStart,
  onToggleAccepting,
  onAddTransition,
  onDeleteState,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const menuX = Math.min(x, window.innerWidth - 200);
  const menuY = Math.min(y, window.innerHeight - 220);

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ left: menuX, top: menuY }}
    >
      <div
        style={{
          padding: '6px 12px 4px',
          fontSize: '0.6875rem',
          color: 'var(--text-muted)',
          fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {stateLabel}
      </div>

      <button
        className="context-menu-item"
        onClick={() => {
          onSetStart(stateId);
          onClose();
        }}
      >
        <Play size={14} />
        {isStart ? '✓ Start State (q₀)' : 'Set as Start State (q₀)'}
      </button>

      <button
        className="context-menu-item"
        onClick={() => {
          onToggleAccepting(stateId);
          onClose();
        }}
      >
        <Target size={14} />
        {isAccepting ? '✓ Accepting State (∈ F)' : 'Mark as Accepting (∈ F)'}
      </button>

      <div className="context-menu-divider" />

      <button
        className="context-menu-item"
        onClick={() => {
          onAddTransition(stateId);
          onClose();
        }}
      >
        <ArrowRightLeft size={14} />
        Add Transition from {stateLabel}
      </button>

      <div className="context-menu-divider" />

      <button
        className="context-menu-item danger"
        onClick={() => {
          onDeleteState(stateId);
          onClose();
        }}
      >
        <Trash2 size={14} />
        Delete State
      </button>
    </div>
  );
};
