/**
 * useAutomata.ts — Custom React hook for managing the automaton's state.
 * 
 * Provides a complete API for building and modifying finite automata:
 *   - Adding/removing states (Q)
 *   - Adding/removing transitions (δ)
 *   - Setting start state (q₀) and accepting states (F)
 *   - Loading presets
 *   - Deriving the alphabet (Σ) and automaton type
 * 
 * This hook owns the "model" of the automaton and exposes it
 * to the Canvas and Academic Panel via React context.
 */

import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  StateNode,
  TransitionEntry,
  AutomatonType,
  AlphabetSymbol,
  AutomatonPreset,
} from '../core/types';
import {
  buildTransitionMap,
  classifyAutomaton,
  extractAlphabet,
} from '../core/AutomataEngine';

export interface AutomataState {
  states: StateNode[];
  transitions: TransitionEntry[];
  startStateId: string | null;
  acceptingStateIds: Set<string>;
  automatonType: AutomatonType;
  alphabet: AlphabetSymbol[];
  stateCounter: number;
}

export interface AutomataActions {
  /** Add a new state at position (x, y) on the canvas */
  addState: (x: number, y: number) => StateNode;
  /** Remove a state and all its associated transitions */
  removeState: (stateId: string) => void;
  /** Update a state's position (for drag-and-drop) */
  updateStatePosition: (stateId: string, x: number, y: number) => void;
  /** Toggle whether a state is an accepting/final state */
  toggleAccepting: (stateId: string) => void;
  /** Set a state as the start state */
  setStartState: (stateId: string) => void;
  /** Add a transition between two states */
  addTransition: (fromId: string, toId: string, symbol: AlphabetSymbol) => void;
  /** Remove a transition by ID */
  removeTransition: (transitionId: string) => void;
  /** Load a preset automaton */
  loadPreset: (preset: AutomatonPreset) => void;
  /** Clear the entire automaton */
  clearAll: () => void;
  /** Rename a state label */
  renameState: (stateId: string, newLabel: string) => void;
}

export function useAutomata(): AutomataState & AutomataActions {
  const [states, setStates] = useState<StateNode[]>([]);
  const [transitions, setTransitions] = useState<TransitionEntry[]>([]);
  const [startStateId, setStartStateId] = useState<string | null>(null);
  const [acceptingStateIds, setAcceptingStateIds] = useState<Set<string>>(new Set());
  const [stateCounter, setStateCounter] = useState(0);

  // Derive automaton type and alphabet from current transitions
  const transitionMap = useMemo(
    () => buildTransitionMap(transitions, states),
    [transitions, states]
  );

  const automatonType = useMemo(
    () => classifyAutomaton(transitionMap),
    [transitionMap]
  );

  const alphabet = useMemo(
    () => extractAlphabet(transitionMap),
    [transitionMap]
  );

  /**
   * Adds a new state to the automaton at the given canvas position.
   * States are labeled sequentially: q₀, q₁, q₂, ...
   */
  const addState = useCallback(
    (x: number, y: number): StateNode => {
      const newState: StateNode = {
        id: uuidv4(),
        label: `q${stateCounter}`,
        x,
        y,
        isAccepting: false,
        isStart: states.length === 0, // First state is auto-start
      };

      setStates((prev) => [...prev, newState]);
      setStateCounter((prev) => prev + 1);

      // If it's the first state, auto-set as start
      if (states.length === 0) {
        setStartStateId(newState.id);
      }

      return newState;
    },
    [stateCounter, states.length]
  );

  /**
   * Removes a state and cascades: removes all transitions involving it,
   * clears start/accepting references.
   */
  const removeState = useCallback(
    (stateId: string) => {
      setStates((prev) => prev.filter((s) => s.id !== stateId));
      setTransitions((prev) =>
        prev.filter(
          (t) => t.fromStateId !== stateId && t.toStateId !== stateId
        )
      );
      if (startStateId === stateId) {
        setStartStateId(null);
      }
      setAcceptingStateIds((prev) => {
        const next = new Set(prev);
        next.delete(stateId);
        return next;
      });
    },
    [startStateId]
  );

  /** Updates a state's canvas position (called during drag events) */
  const updateStatePosition = useCallback(
    (stateId: string, x: number, y: number) => {
      setStates((prev) =>
        prev.map((s) => (s.id === stateId ? { ...s, x, y } : s))
      );
    },
    []
  );

  /** Toggles a state's membership in the accepting set F */
  const toggleAccepting = useCallback((stateId: string) => {
    setAcceptingStateIds((prev) => {
      const next = new Set(prev);
      if (next.has(stateId)) {
        next.delete(stateId);
      } else {
        next.add(stateId);
      }
      return next;
    });
    setStates((prev) =>
      prev.map((s) =>
        s.id === stateId ? { ...s, isAccepting: !s.isAccepting } : s
      )
    );
  }, []);

  /** Sets a state as q₀ (the unique start state) */
  const setStartState = useCallback((stateId: string) => {
    setStartStateId(stateId);
    setStates((prev) =>
      prev.map((s) => ({
        ...s,
        isStart: s.id === stateId,
      }))
    );
  }, []);

  /** Adds a new transition δ(from, symbol) → to */
  const addTransition = useCallback(
    (fromId: string, toId: string, symbol: AlphabetSymbol) => {
      // Check for duplicate transitions
      const exists = transitions.some(
        (t) =>
          t.fromStateId === fromId &&
          t.toStateId === toId &&
          t.symbol === symbol
      );
      if (exists) return;

      const newTransition: TransitionEntry = {
        id: uuidv4(),
        fromStateId: fromId,
        toStateId: toId,
        symbol,
      };
      setTransitions((prev) => [...prev, newTransition]);
    },
    [transitions]
  );

  /** Removes a transition by ID */
  const removeTransition = useCallback((transitionId: string) => {
    setTransitions((prev) => prev.filter((t) => t.id !== transitionId));
  }, []);

  /** Loads a preset automaton, replacing the current configuration */
  const loadPreset = useCallback((preset: AutomatonPreset) => {
    setStates(preset.states);
    setTransitions(preset.transitions);

    const start = preset.states.find((s) => s.isStart);
    setStartStateId(start?.id ?? null);

    const accepting = new Set(
      preset.states.filter((s) => s.isAccepting).map((s) => s.id)
    );
    setAcceptingStateIds(accepting);

    const maxIndex = preset.states.reduce((max, s) => {
      const match = s.label.match(/\d+/);
      return match ? Math.max(max, parseInt(match[0]) + 1) : max;
    }, 0);
    setStateCounter(maxIndex);
  }, []);

  /** Clears all states, transitions, and configuration */
  const clearAll = useCallback(() => {
    setStates([]);
    setTransitions([]);
    setStartStateId(null);
    setAcceptingStateIds(new Set());
    setStateCounter(0);
  }, []);

  /** Renames a state's label */
  const renameState = useCallback(
    (stateId: string, newLabel: string) => {
      setStates((prev) =>
        prev.map((s) => (s.id === stateId ? { ...s, label: newLabel } : s))
      );
    },
    []
  );

  return {
    states,
    transitions,
    startStateId,
    acceptingStateIds,
    automatonType,
    alphabet,
    stateCounter,
    addState,
    removeState,
    updateStatePosition,
    toggleAccepting,
    setStartState,
    addTransition,
    removeTransition,
    loadPreset,
    clearAll,
    renameState,
  };
}
