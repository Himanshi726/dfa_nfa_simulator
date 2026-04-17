/**
 * SubsetConstruction.ts — Implementation of the Powerset Construction algorithm.
 *
 * Converts a Non-deterministic Finite Automaton (ε-NFA) into an
 * equivalent Deterministic Finite Automaton (DFA).
 *
 * Algorithm Overview:
 *   1. Begin with the ε-closure of the NFA's start state as the initial DFA state.
 *   2. For each DFA state (representing a set of NFA states) and each alphabet symbol:
 *      - Compute the move result for all states in the set.
 *      - Compute the ε-closure of the resulting set.
 *      - This new set becomes a state in the DFA.
 *   3. Mark DFA states as 'accepting' if any of their constituent NFA states are accepting.
 *
 * This process ensures that for any input string, the DFA follows exactly one path.
 */

import { v4 as uuidv4 } from 'uuid';
import type { StateNode, TransitionEntry, AlphabetSymbol } from './types';
import { epsilonClosure, move, buildTransitionMap } from './AutomataEngine';

export interface DFAConstructionResult {
  states: StateNode[];
  transitions: TransitionEntry[];
}

/**
 * Converts an ε-NFA to a DFA using Subset Construction.
 *
 * @param nfaStates - Array of NFA state nodes
 * @param nfaTransitions - Array of NFA transitions
 * @returns An object containing the new DFA's states and transitions
 */
export function subsetConstruction(
  nfaStates: StateNode[],
  nfaTransitions: TransitionEntry[]
): DFAConstructionResult {
  if (nfaStates.length === 0) return { states: [], transitions: [] };

  // ─── Setup ──────────────────────────────────────────────────

  const nfaTransitionMap = buildTransitionMap(nfaTransitions, nfaStates);
  const nfaStateIdMap: Record<string, string> = {}; // ID -> Label
  const nfaStateLabelMap: Record<string, string> = {}; // Label -> ID
  const nfaAcceptingIds = new Set(nfaStates.filter(s => s.isAccepting).map(s => s.id));
  const nfaStartNode = nfaStates.find(s => s.isStart);

  for (const s of nfaStates) {
    nfaStateIdMap[s.id] = s.label;
    nfaStateLabelMap[s.label] = s.id;
  }

  // Get Alphabet (unique symbols excluding Epsilon)
  const alphabet = Array.from(new Set(nfaTransitions.map(t => t.symbol))).filter(s => s !== 'ε');

  // Helper: Hash a set of NFA states for mapping
  const getSubsetHash = (subset: Set<string>): string => {
    return Array.from(subset).sort().join(',');
  };

  // Helper: Check if a subset contains any accepting NFA states
  const isAcceptingSubset = (subset: Set<string>): boolean => {
    for (const label of subset) {
      if (nfaAcceptingIds.has(nfaStateLabelMap[label])) return true;
    }
    return false;
  };

  // ─── Algorithm ──────────────────────────────────────────────

  const dfaStates: StateNode[] = [];
  const dfaTransitions: TransitionEntry[] = [];
  
  // Mapping of NFA state label sets (hashed) to DFA State Nodes
  const subsetMap = new Map<string, string>(); // hash -> dfaStateId
  const unprocessed: Set<string>[] = [];

  // Start State: ε-closure({start_nfa})
  const initialLabels = new Set<string>();
  if (nfaStartNode) initialLabels.add(nfaStartNode.label);
  
  const { states: startClosure } = epsilonClosure(initialLabels, nfaTransitionMap);
  const startHash = getSubsetHash(startClosure);
  
  const startDfaId = uuidv4();
  subsetMap.set(startHash, startDfaId);
  unprocessed.push(startClosure);

  // Keep track of visited hashes to avoid infinite loops
  const visited = new Set<string>();

  let dfaStateCounter = 0;

  while (unprocessed.length > 0) {
    const currentSubset = unprocessed.shift()!;
    const currentHash = getSubsetHash(currentSubset);

    if (visited.has(currentHash)) continue;
    visited.add(currentHash);

    const currentDfaId = subsetMap.get(currentHash)!;
    
    // Create the DFA State Node
    dfaStates.push({
      id: currentDfaId,
      label: `q${dfaStateCounter++}`,
      isStart: currentHash === startHash,
      isAccepting: isAcceptingSubset(currentSubset),
      x: 0, // Will layout later
      y: 0,
    });

    // Compute transitions for each symbol
    for (const symbol of alphabet) {
      const { nextStates: moveResult } = move(currentSubset, symbol, nfaTransitionMap);
      if (moveResult.size === 0) continue;

      const { states: targetClosure } = epsilonClosure(moveResult, nfaTransitionMap);
      const targetHash = getSubsetHash(targetClosure);

      let targetDfaId = subsetMap.get(targetHash);
      if (!targetDfaId) {
        targetDfaId = uuidv4();
        subsetMap.set(targetHash, targetDfaId);
        unprocessed.push(targetClosure);
      }

      dfaTransitions.push({
        id: uuidv4(),
        fromStateId: currentDfaId,
        toStateId: targetDfaId,
        symbol: symbol,
      });
    }
  }

  // ─── Layout ─────────────────────────────────────────────────
  
  // Simple horizontal layout: 200px spacing
  const SPACING_X = 180;
  const SPACING_Y = 140;
  const ROWS = Math.ceil(Math.sqrt(dfaStates.length));

  dfaStates.forEach((state, index) => {
    const col = index % ROWS;
    const row = Math.floor(index / ROWS);
    state.x = 150 + col * SPACING_X;
    state.y = 150 + row * SPACING_Y;
  });

  return {
    states: dfaStates,
    transitions: dfaTransitions,
  };
}
