/**
 * ControlBar.tsx — Simulation control bar with playback controls and input field.
 * 
 * Contains:
 *   - Input field for the test string
 *   - Play, Pause, Step Forward, Step Backward, Reset buttons
 *   - Speed control slider
 *   - String visualization showing consumed/current/pending characters
 *   - Simulation result badge (accepted/rejected)
 */

import React, { useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Zap,
  Gauge,
} from 'lucide-react';
import type { SimulationStatus, SimulationState, SimulationActions } from '../hooks/useSimulation';

interface ControlBarProps extends SimulationState, SimulationActions {}

export const ControlBar: React.FC<ControlBarProps> = ({
  inputString,
  result,
  currentStepIndex,
  status,
  activeTransitionIds,
  playbackSpeed,
  setInputString,
  runSimulation,
  stepForward,
  stepBackward,
  play,
  pause,
  reset,
  setPlaybackSpeed,
}) => {
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputString(e.target.value);
      reset();
    },
    [setInputString, reset]
  );

  const handleRunClick = useCallback(() => {
    runSimulation();
  }, [runSimulation]);

  const isSimulating = status !== 'idle';
  const canStepForward =
    result && currentStepIndex < result.steps.length - 1;
  const canStepBackward = result && currentStepIndex > 0;

  return (
    <div className="control-bar">
      {/* Input string field */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
        <label
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
          }}
        >
          Input w =
        </label>
        <input
          type="text"
          className="input-field"
          placeholder='e.g. "0110"'
          value={inputString}
          onChange={handleInputChange}
          style={{ width: 160, fontFamily: "'JetBrains Mono', monospace" }}
          id="simulation-input"
        />
      </div>

      {/* Run / Reset button */}
      {!isSimulating ? (
        <button className="btn btn-primary" onClick={handleRunClick} id="run-simulation-btn">
          <Zap size={15} />
          Simulate
        </button>
      ) : (
        <button className="btn btn-danger" onClick={reset} id="reset-simulation-btn">
          <RotateCcw size={15} />
          Reset
        </button>
      )}

      {/* Divider */}
      <div
        style={{
          width: 1,
          height: 24,
          background: 'var(--border-default)',
          margin: '0 4px',
        }}
      />

      {/* Playback controls */}
      <button
        className="btn btn-icon btn-ghost"
        onClick={stepBackward}
        disabled={!canStepBackward}
        title="Step Backward"
        id="step-backward-btn"
      >
        <SkipBack size={16} />
      </button>

      {status === 'running' ? (
        <button
          className="btn btn-icon"
          onClick={pause}
          title="Pause"
          id="pause-btn"
        >
          <Pause size={16} />
        </button>
      ) : (
        <button
          className="btn btn-icon btn-success"
          onClick={play}
          disabled={!result || status === 'finished'}
          title="Play"
          id="play-btn"
        >
          <Play size={16} />
        </button>
      )}

      <button
        className="btn btn-icon btn-ghost"
        onClick={stepForward}
        disabled={!canStepForward}
        title="Step Forward"
        id="step-forward-btn"
      >
        <SkipForward size={16} />
      </button>

      {/* Divider */}
      <div
        style={{
          width: 1,
          height: 24,
          background: 'var(--border-default)',
          margin: '0 4px',
        }}
      />

      {/* Speed control */}
      <div className="speed-control">
        <Gauge size={14} />
        <input
          type="range"
          min={100}
          max={2000}
          step={100}
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
          title={`Speed: ${playbackSpeed}ms per step`}
        />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", minWidth: 48 }}>
          {playbackSpeed}ms
        </span>
      </div>

      {/* Spring spacer */}
      <div style={{ flex: 1 }} />

      {/* String visualization */}
      {isSimulating && inputString.length > 0 && (
        <div className="string-display">
          {inputString.split('').map((char, i) => {
            let className = 'string-char ';
            if (i < currentStepIndex) {
              className += 'consumed';
            } else if (i === currentStepIndex - 1 || (currentStepIndex === 0 && i === 0 && status === 'ready')) {
              className += currentStepIndex > 0 ? 'consumed' : 'pending';
            } else if (i === currentStepIndex) {
              className += 'current';
            } else {
              className += 'pending';
            }
            return (
              <span key={i} className={className}>
                {char}
              </span>
            );
          })}
        </div>
      )}

      {/* Result badge */}
      {status === 'finished' && result && (
        <span
          className={`badge ${result.accepted ? 'badge-accepted' : 'badge-rejected'}`}
        >
          {result.accepted ? '✓ ACCEPTED' : '✗ REJECTED'}
        </span>
      )}

      {result?.error && (
        <span className="badge badge-rejected">⚠ {result.error}</span>
      )}
    </div>
  );
};
