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

import React, { useState, useCallback, useEffect } from 'react';
import { CircuitBoard } from 'lucide-react';
import { AutomataCanvas } from './components/AutomataCanvas';
import { ControlBar } from './components/ControlBar';
import { Sidebar } from './components/Sidebar';
import { ContextMenu } from './components/ContextMenu';
import { TransitionDialog } from './components/TransitionDialog';
import { LandingPage } from './components/LandingPage';
import { useAutomata } from './hooks/useAutomata';
import { useSimulation } from './hooks/useSimulation';
import { compileRegex, compileRegexToDFA } from './core/RegexEngine';

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
  const [hasStarted, setHasStarted] = useState(false);
  const [regexMode, setRegexMode] = useState(false);
  const [regexPattern, setRegexPattern] = useState('');
  const [regexError, setRegexError] = useState<string | undefined>(undefined);
  const [regexParsed, setRegexParsed] = useState('');

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

  // Ctrl+Z Undo Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+z or Cmd+z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        automata.undoAction();
      }
    };
    
    // Only bind the keydown if we're past the landing page
    if (hasStarted) {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasStarted, automata]);

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

  const handleAddTransitionClick = useCallback(() => {
    // If there's at least one state, just pick the first one as default
    if (automata.states.length > 0) {
      setTransitionDialog({
        visible: true,
        fromStateId: automata.states[0].id,
        fromStateLabel: automata.states[0].label,
      });
    }
  }, [automata.states]);

  // Regex compile handler
  const handleCompileRegex = useCallback(() => {
    const result = compileRegex(regexPattern);
    if (result.success) {
      setRegexError(undefined);
      setRegexParsed(result.parsedString);
      // Load the generated ε-NFA
      automata.loadPreset({
        name: `Regex: ${regexPattern}`,
        description: `ε-NFA generated from regex: ${result.parsedString}`,
        type: 'ε-NFA',
        testStrings: [],
        states: result.states,
        transitions: result.transitions,
      });
      simulation.reset();
    } else {
      setRegexError(result.error);
      setRegexParsed('');
    }
  }, [regexPattern, automata, simulation]);

  const handleCompileRegexDFA = useCallback(() => {
    const result = compileRegexToDFA(regexPattern);
    if (result.success) {
      setRegexError(undefined);
      setRegexParsed(result.parsedString);
      // Load the generated DFA
      automata.loadPreset({
        name: `Regex DFA: ${regexPattern}`,
        description: `DFA generated from regex: ${result.parsedString}`,
        type: 'DFA',
        testStrings: [],
        states: result.states,
        transitions: result.transitions,
      });
      simulation.reset();
    } else {
      setRegexError(result.error);
      setRegexParsed('');
    }
  }, [regexPattern, automata, simulation]);

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

  if (!hasStarted) {
    return <LandingPage onStart={() => setHasStarted(true)} />;
  }

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <CircuitBoard size={22} style={{ marginRight: 10, color: '#f472b6' }} />
          <h1>Finite Automata Simulator</h1>
          <span className="subtitle">DFA · NFA · ε-NFA · Regex</span>
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
          activeTransitionIds={simulation.activeTransitionIds}
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
        onAddTransitionClick={handleAddTransitionClick}
        onRemoveTransition={automata.removeTransition}
        onUndoAction={automata.undoAction}
        onClearAll={automata.clearAll}
        regexMode={regexMode}
        regexPattern={regexPattern}
        regexError={regexError}
        regexParsed={regexParsed}
        onToggleRegexMode={() => setRegexMode(prev => !prev)}
        onRegexPatternChange={setRegexPattern}
        onCompileRegex={handleCompileRegex}
        onCompileRegexDFA={handleCompileRegexDFA}
      />

      {/* Control Bar */}
      <ControlBar
        inputString={simulation.inputString}
        result={simulation.result}
        currentStepIndex={simulation.currentStepIndex}
        currentStep={simulation.currentStep}
        status={simulation.status}
        activeStateIds={simulation.activeStateIds}
        activeTransitionIds={simulation.activeTransitionIds}
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
