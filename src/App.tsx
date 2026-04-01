/**
 * App.tsx — Main application component for the Finite Automata Simulator.
 * 
 * Orchestrates all sub-components:
 *   - AutomataCanvas: Interactive state/transition drawing
 *   - ControlBar: Simulation playback controls
 *   - Sidebar: Formal definition + Trace table + Presets
 *   - ContextMenu: Right-click state actions
 *   - TransitionDialog: Modal for adding transitions
 * 
 * Connects the pure AutomataEngine to the visual UI via
 * useAutomata and useSimulation custom hooks.
 */

import React, { useState, useCallback } from 'react';
import { CircuitBoard } from 'lucide-react';
import { AutomataCanvas } from './components/AutomataCanvas';
import { ControlBar } from './components/ControlBar';
import { Sidebar } from './components/Sidebar';
import { ContextMenu } from './components/ContextMenu';
import { TransitionDialog } from './components/TransitionDialog';
import { useAutomata } from './hooks/useAutomata';
import { useSimulation } from './hooks/useSimulation';

// Context menu state
interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  stateId: string;
}

// Transition dialog state
interface TransitionDialogState {
  visible: boolean;
  fromStateId: string;
  fromStateLabel: string;
}

const App: React.FC = () => {
  const automata = useAutomata();
  const simulation = useSimulation(
    automata.states,
    automata.transitions,
    automata.startStateId,
    automata.acceptingStateIds
  );

  // UI state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    stateId: '',
  });

  const [transitionDialog, setTransitionDialog] = useState<TransitionDialogState>({
    visible: false,
    fromStateId: '',
    fromStateLabel: '',
  });

  // Canvas handlers
  const handleAddState = useCallback(
    (x: number, y: number) => {
      automata.addState(x, y);
    },
    [automata]
  );

  const handleMoveState = useCallback(
    (id: string, x: number, y: number) => {
      automata.updateStatePosition(id, x, y);
    },
    [automata]
  );

  const handleContextMenu = useCallback(
    (stateId: string, x: number, y: number) => {
      setContextMenu({ visible: true, x, y, stateId });
    },
    []
  );

  const handleDoubleClickState = useCallback(
    (stateId: string) => {
      automata.toggleAccepting(stateId);
    },
    [automata]
  );

  const handleSelectStatesForTransition = useCallback(
    (fromId: string, toId: string) => {
      const fromState = automata.states.find((s) => s.id === fromId);
      if (fromState) {
        setTransitionDialog({
          visible: true,
          fromStateId: fromId,
          fromStateLabel: fromState.label,
        });
        // We'll modify this to pre-select the target in the dialog
        // For now, let the user pick in the dialog
      }
    },
    [automata.states]
  );

  const handleOpenTransition = useCallback(
    (fromId: string) => {
      const fromState = automata.states.find((s) => s.id === fromId);
      if (fromState) {
        setTransitionDialog({
          visible: true,
          fromStateId: fromId,
          fromStateLabel: fromState.label,
        });
      }
    },
    [automata.states]
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleCloseTransitionDialog = useCallback(() => {
    setTransitionDialog((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleAddTransition = useCallback(
    (fromId: string, toId: string, symbol: string) => {
      automata.addTransition(fromId, toId, symbol);
    },
    [automata]
  );

  // Get the context menu target state
  const contextMenuState = automata.states.find(
    (s) => s.id === contextMenu.stateId
  );

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <CircuitBoard size={22} style={{ marginRight: 10, color: '#60a5fa' }} />
          <h1>Finite Automata Simulator</h1>
          <span className="subtitle">DFA · NFA · ε-NFA</span>
        </div>
        <div className="header-controls">
          <span className="badge badge-type">{automata.automatonType}</span>
        </div>
      </header>

      {/* Canvas */}
      <div className="canvas-area">
        <AutomataCanvas
          states={automata.states}
          transitions={automata.transitions}
          activeStateIds={simulation.activeStateIds}
          startStateId={automata.startStateId}
          onAddState={handleAddState}
          onMoveState={handleMoveState}
          onContextMenu={handleContextMenu}
          onDoubleClickState={handleDoubleClickState}
          onSelectStatesForTransition={handleSelectStatesForTransition}
        />
      </div>

      {/* Sidebar */}
      <Sidebar
        states={automata.states}
        transitions={automata.transitions}
        startStateId={automata.startStateId}
        acceptingStateIds={automata.acceptingStateIds}
        automatonType={automata.automatonType}
        alphabet={automata.alphabet}
        simulationResult={simulation.result}
        currentStepIndex={simulation.currentStepIndex}
        onLoadPreset={automata.loadPreset}
        onRemoveTransition={automata.removeTransition}
        onClearAll={automata.clearAll}
      />

      {/* Control Bar */}
      <ControlBar
        inputString={simulation.inputString}
        result={simulation.result}
        currentStepIndex={simulation.currentStepIndex}
        currentStep={simulation.currentStep}
        status={simulation.status}
        activeStateIds={simulation.activeStateIds}
        playbackSpeed={simulation.playbackSpeed}
        setInputString={simulation.setInputString}
        runSimulation={simulation.runSimulation}
        stepForward={simulation.stepForward}
        stepBackward={simulation.stepBackward}
        play={simulation.play}
        pause={simulation.pause}
        reset={simulation.reset}
        setPlaybackSpeed={simulation.setPlaybackSpeed}
      />

      {/* Context Menu */}
      {contextMenu.visible && contextMenuState && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          stateId={contextMenu.stateId}
          stateLabel={contextMenuState.label}
          isAccepting={automata.acceptingStateIds.has(contextMenu.stateId)}
          isStart={automata.startStateId === contextMenu.stateId}
          onClose={handleCloseContextMenu}
          onSetStart={automata.setStartState}
          onToggleAccepting={automata.toggleAccepting}
          onAddTransition={handleOpenTransition}
          onDeleteState={automata.removeState}
        />
      )}

      {/* Transition Dialog */}
      {transitionDialog.visible && (
        <TransitionDialog
          fromStateId={transitionDialog.fromStateId}
          fromStateLabel={transitionDialog.fromStateLabel}
          states={automata.states}
          onAdd={handleAddTransition}
          onClose={handleCloseTransitionDialog}
        />
      )}
    </div>
  );
};

export default App;
