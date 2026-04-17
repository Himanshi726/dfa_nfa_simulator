/**
 * AutomataEngine.ts — Pure TypeScript implementation of the Finite Automata Engine.
 * 
 * This module is 100% independent of React/Canvas and can execute in any
 * JavaScript/TypeScript runtime (Node.js, browser, etc.).
 * 
 * Implements:
 *   - DFA simulation (single-path deterministic traversal)
 *   - NFA simulation (parallel state tracking via subset construction)
 *   - ε-NFA simulation (epsilon closure computation via BFS)
 * 
 * All functions are pure and return immutable results.
 */

import type {
  State,
  AlphabetSymbol,
  TransitionMap,
  TransitionEntry,
  StateNode,
  SimulationStep,
  SimulationResult,
  AutomatonType,
} from './types';
import { EPSILON } from './types';

/**
 * Builds the transition map δ from a flat array of TransitionEntry objects.
 * 
 * Converts the declarative transition list into the efficient lookup structure:
 *   δ: State × Symbol → P(State)
 * 
 * This is the core data structure used by all simulation algorithms.
 * 
 * @param transitions - Array of transition entries
 * @param states - Array of state nodes (for ID → label resolution)
 * @returns TransitionMap indexed by state label and symbol
 */
export function buildTransitionMap(
  transitions: TransitionEntry[],
  states: StateNode[]
): TransitionMap {
  const stateIdToLabel: Record<string, State> = {};
  for (const state of states) {
    stateIdToLabel[state.id] = state.label;
  }

  const transitionMap: TransitionMap = {};

  // Initialize empty maps for all states
  for (const state of states) {
    transitionMap[state.label] = {};
  }

  // Populate the transition map from entries
  for (const entry of transitions) {
    const fromLabel = stateIdToLabel[entry.fromStateId];
    const toLabel = stateIdToLabel[entry.toStateId];

    if (!fromLabel || !toLabel) continue;

    if (!transitionMap[fromLabel]) {
      transitionMap[fromLabel] = {};
    }

    if (!transitionMap[fromLabel][entry.symbol]) {
      transitionMap[fromLabel][entry.symbol] = [];
    }

    // Avoid duplicate transitions
    if (!transitionMap[fromLabel][entry.symbol].includes(toLabel)) {
      transitionMap[fromLabel][entry.symbol].push(toLabel);
    }
  }

  return transitionMap;
}

/**
 * Computes the epsilon closure (ε-closure) of a set of states.
 * 
 * The ε-closure of a set S is defined as the set of all states reachable
 * from any state in S by following zero or more epsilon (ε) transitions.
 * 
 * Formally: ε-closure(S) = S ∪ { q ∈ Q | ∃ p ∈ S, p →*ε q }
 * 
 * Uses Breadth-First Search (BFS) to explore all reachable states
 * via epsilon transitions, preventing infinite loops from epsilon cycles.
 * 
 * @param stateLabels - Set of state labels to compute closure for
 * @param transitionMap - The δ transition function
 * @returns Set of all states reachable via epsilon transitions (including input states)
 */
export function epsilonClosure(
  stateLabels: Set<State>,
  transitionMap: TransitionMap,
  stateIdMap?: Record<State, string>,
  transitions?: TransitionEntry[]
): { states: Set<State>, transitionIds: Set<string> } {
  const closure = new Set<State>(stateLabels);
  const transitionIds = new Set<string>();
  const queue: State[] = [...stateLabels];

  // BFS: explore all states reachable via ε-transitions
  while (queue.length > 0) {
    const currentState = queue.shift()!;
    const epsilonTargets = transitionMap[currentState]?.[EPSILON] ?? [];

    for (const target of epsilonTargets) {
      if (!closure.has(target)) {
        closure.add(target);
        queue.push(target);
        
        if (stateIdMap && transitions) {
          const fromId = stateIdMap[currentState];
          const toId = stateIdMap[target];
          const trans = transitions.find(t => t.fromStateId === fromId && t.toStateId === toId && t.symbol === EPSILON);
          if (trans) transitionIds.add(trans.id);
        }
      }
    }
  }

  return { states: closure, transitionIds };
}

/**
 * Computes the set of states reachable from a set of current states
 * by consuming a single input symbol.
 * 
 * For NFA: move(S, a) = ∪_{q ∈ S} δ(q, a)
 * 
 * This function does NOT compute epsilon closure — that must be applied
 * separately after calling this function for ε-NFA.
 * 
 * @param currentStates - Set of current active state labels
 * @param symbol - The input symbol to consume
 * @param transitionMap - The δ transition function
 * @returns Set of states reachable by consuming the symbol
 */
export function move(
  currentStates: Set<State>,
  symbol: AlphabetSymbol,
  transitionMap: TransitionMap,
  stateIdMap?: Record<State, string>,
  transitions?: TransitionEntry[]
): { nextStates: Set<State>, transitionIds: Set<string> } {
  const nextStates = new Set<State>();
  const transitionIds = new Set<string>();

  for (const state of currentStates) {
    const targets = transitionMap[state]?.[symbol] ?? [];
    for (const target of targets) {
      nextStates.add(target);
      
      if (stateIdMap && transitions) {
        const fromId = stateIdMap[state];
        const toId = stateIdMap[target];
        // Note: Multiple transitions might exist for the same symbol/nodes in raw form
        const transList = transitions.filter(t => t.fromStateId === fromId && t.toStateId === toId && t.symbol === symbol);
        transList.forEach(t => transitionIds.add(t.id));
      }
    }
  }

  return { nextStates, transitionIds };
}

/**
 * Determines the type of automaton based on its transition structure.
 * 
 * Classification rules:
 *   - ε-NFA: Has any epsilon transitions
 *   - NFA: Has any state with multiple transitions on the same symbol
 *   - DFA: Each (state, symbol) pair maps to exactly one state, no ε-transitions
 * 
 * @param transitionMap - The δ transition function
 * @returns The automaton type classification
 */
export function classifyAutomaton(transitionMap: TransitionMap): AutomatonType {
  let hasEpsilon = false;
  let isNonDeterministic = false;

  for (const state of Object.keys(transitionMap)) {
    const symbolMap = transitionMap[state];
    for (const symbol of Object.keys(symbolMap)) {
      if (symbol === EPSILON) {
        hasEpsilon = true;
      }
      if (symbolMap[symbol].length > 1) {
        isNonDeterministic = true;
      }
    }
  }

  if (hasEpsilon) return 'ε-NFA';
  if (isNonDeterministic) return 'NFA';
  return 'DFA';
}

/**
 * Extracts the input alphabet Σ from the transition map.
 * 
 * Collects all unique symbols used in transitions, excluding epsilon (ε).
 * Returns the alphabet sorted in natural order.
 * 
 * @param transitionMap - The δ transition function
 * @returns Sorted array of alphabet symbols
 */
export function extractAlphabet(transitionMap: TransitionMap): AlphabetSymbol[] {
  const symbols = new Set<AlphabetSymbol>();

  for (const state of Object.keys(transitionMap)) {
    for (const symbol of Object.keys(transitionMap[state])) {
      if (symbol !== EPSILON) {
        symbols.add(symbol);
      }
    }
  }

  return [...symbols].sort();
}

/**
 * Simulates a Deterministic Finite Automaton (DFA) on an input string.
 * 
 * DFA Simulation Algorithm:
 *   1. Start at q₀
 *   2. For each symbol aᵢ in the input w = a₁a₂...aₙ:
 *      - Compute δ(currentState, aᵢ) → exactly one next state
 *      - If no transition exists, the string is rejected (dead state)
 *   3. After processing all symbols, accept iff currentState ∈ F
 * 
 * Time Complexity: O(|w|) — linear in the input length
 * Space Complexity: O(1) — only tracks one active state
 * 
 * @param inputString - The input string w to simulate
 * @param startStateLabel - The start state q₀
 * @param acceptingStateLabels - The set of accepting states F
 * @param transitionMap - The δ transition function
 * @param stateIdMap - Map from state labels to state IDs (for UI tracking)
 * @returns Complete simulation result with step-by-step trace
 */
export function simulateDFA(
  inputString: string,
  startStateLabel: State,
  acceptingStateLabels: Set<State>,
  transitionMap: TransitionMap,
  stateIdMap: Record<State, string>,
  transitions: TransitionEntry[]
): SimulationResult {
  const steps: SimulationStep[] = [];
  let currentState: State = startStateLabel;

  // Step 0: Initial configuration
  steps.push({
    stepIndex: 0,
    symbolConsumed: null,
    activeStateIds: new Set([stateIdMap[currentState]]),
    activeTransitionIds: new Set(),
    description: `Start at state ${currentState}`,
  });

  // Process each symbol in the input string
  for (let i = 0; i < inputString.length; i++) {
    const symbol = inputString[i];
    const nextStates = transitionMap[currentState]?.[symbol];

    if (!nextStates || nextStates.length === 0) {
      // Dead state — no transition defined for (currentState, symbol)
      steps.push({
        stepIndex: i + 1,
        symbolConsumed: symbol,
        activeStateIds: new Set<string>(),
        activeTransitionIds: new Set<string>(),
        description: `δ(${currentState}, ${symbol}) = ∅ — no transition (DEAD STATE)`,
      });
      return {
        inputString,
        steps,
        accepted: false,
        completed: true,
      };
    }

    // DFA: exactly one transition
    const nextState = nextStates[0];
    
    // Find transition used
    const fromId = stateIdMap[currentState];
    const toId = stateIdMap[nextState];
    const transitionUsed = transitions.find(t => t.fromStateId === fromId && t.toStateId === toId && t.symbol === symbol);

    currentState = nextState;
    steps.push({
      stepIndex: i + 1,
      symbolConsumed: symbol,
      activeStateIds: new Set([stateIdMap[currentState]]),
      activeTransitionIds: new Set(transitionUsed ? [transitionUsed.id] : []),
      description: `δ(${steps[i].description.split(' ').pop()}, ${symbol}) = ${currentState}`,
    });
  }

  // Check if final state is accepting
  const isAccepted = acceptingStateLabels.has(currentState);

  // Fix the last step description to be cleaner
  if (steps.length > 1) {
    const lastStep = steps[steps.length - 1];
    const prevState = [...steps[steps.length - 2].activeStateIds];
    const prevLabel = Object.entries(stateIdMap).find(([, id]) => prevState.includes(id))?.[0] ?? '?';
    lastStep.description = `δ(${prevLabel}, ${lastStep.symbolConsumed}) = ${currentState}`;
  }

  return {
    inputString,
    steps,
    accepted: isAccepted,
    completed: true,
  };
}

/**
 * Simulates a Non-deterministic Finite Automaton (NFA / ε-NFA) on an input string.
 * 
 * NFA Simulation Algorithm (Subset Construction / Parallel Tracking):
 *   1. Compute ε-closure({q₀}) to get the initial set of active states
 *   2. For each symbol aᵢ in the input w = a₁a₂...aₙ:
 *      a. Compute move(activeStates, aᵢ) — all states reachable by consuming aᵢ
 *      b. Compute ε-closure(result) — all states reachable via subsequent ε-transitions
 *      c. The result is the new set of active states
 *   3. After processing all symbols, accept iff activeStates ∩ F ≠ ∅
 * 
 * This is equivalent to the 'on-the-fly' subset construction without
 * materializing the full DFA.
 * 
 * Time Complexity: O(|w| × |Q|²) — for each symbol, we may visit all state pairs
 * Space Complexity: O(|Q|) — tracks a subset of states
 * 
 * @param inputString - The input string w to simulate
 * @param startStateLabel - The start state q₀
 * @param acceptingStateLabels - The set of accepting states F
 * @param transitionMap - The δ transition function
 * @param stateIdMap - Map from state labels to state IDs (for UI tracking)
 * @returns Complete simulation result with step-by-step trace
 */
export function simulateNFA(
  inputString: string,
  startStateLabel: State,
  acceptingStateLabels: Set<State>,
  transitionMap: TransitionMap,
  stateIdMap: Record<State, string>,
  transitions: TransitionEntry[]
): SimulationResult {
  const steps: SimulationStep[] = [];

  // Step 0: Compute ε-closure of the start state
  let { states: currentActiveStates, transitionIds: stepEpsilonTrans } = epsilonClosure(
    new Set([startStateLabel]),
    transitionMap,
    stateIdMap,
    transitions
  );

  const activeIds = new Set(
    [...currentActiveStates].map((s) => stateIdMap[s]).filter(Boolean)
  );

  const closureStr = `{${[...currentActiveStates].join(', ')}}`;
  steps.push({
    stepIndex: 0,
    symbolConsumed: null,
    activeStateIds: activeIds,
    activeTransitionIds: stepEpsilonTrans,
    description: `ε-closure({${startStateLabel}}) = ${closureStr}`,
  });

  // Process each symbol in the input string
  for (let i = 0; i < inputString.length; i++) {
    const symbol = inputString[i];

    // Step a: Compute move(currentActiveStates, symbol)
    const { nextStates: moveResultStates, transitionIds: moveTrans } = move(
      currentActiveStates, symbol, transitionMap, stateIdMap, transitions
    );

    // Step b: Compute ε-closure of the move result
    const { states: nextActiveStates, transitionIds: subEpsilonTrans } = epsilonClosure(
      moveResultStates, transitionMap, stateIdMap, transitions
    );

    // Record the step
    const nextIds = new Set(
      [...nextActiveStates].map((s) => stateIdMap[s]).filter(Boolean)
    );
    
    // Combine transition IDs
    const combinedTransIds = new Set([...moveTrans, ...subEpsilonTrans]);

    const fromStr = `{${[...currentActiveStates].join(', ')}}`;
    const toStr =
      nextActiveStates.size > 0
        ? `{${[...nextActiveStates].join(', ')}}`
        : '∅';

    steps.push({
      stepIndex: i + 1,
      symbolConsumed: symbol,
      activeStateIds: nextIds,
      activeTransitionIds: combinedTransIds,
      description: `ε-closure(move(${fromStr}, ${symbol})) = ${toStr}`,
    });

    currentActiveStates = nextActiveStates;

    // If no active states remain, the string is trapped (will be rejected)
    if (currentActiveStates.size === 0) {
      // Continue processing to show full trace, but we know it's rejected
    }
  }

  // Check if any active state is in the accepting set
  let accepted = false;
  for (const state of currentActiveStates) {
    if (acceptingStateLabels.has(state)) {
      accepted = true;
      break;
    }
  }

  return {
    inputString,
    steps,
    accepted,
    completed: true,
  };
}

/**
 * Main simulation dispatcher — runs the appropriate algorithm based on
 * the automaton's structure.
 * 
 * Automatically classifies the automaton (DFA vs NFA vs ε-NFA) and
 * delegates to the correct simulation function.
 * 
 * @param inputString - The input string to simulate
 * @param states - Array of state nodes
 * @param transitions - Array of transition entries
 * @param startStateId - The ID of the start state
 * @param acceptingStateIds - Set of accepting state IDs
 * @returns Complete simulation result
 */
export function simulate(
  inputString: string,
  states: StateNode[],
  transitions: TransitionEntry[],
  startStateId: string | null,
  acceptingStateIds: Set<string>
): SimulationResult {
  // Validate: must have a start state
  if (!startStateId) {
    return {
      inputString,
      steps: [],
      accepted: false,
      completed: false,
      error: 'No start state defined. Right-click a state to set it as start.',
    };
  }

  // Validate: must have at least one state
  if (states.length === 0) {
    return {
      inputString,
      steps: [],
      accepted: false,
      completed: false,
      error: 'No states defined. Click on the canvas to add states.',
    };
  }

  // Build data structures
  const transitionMap = buildTransitionMap(transitions, states);
  const automatonType = classifyAutomaton(transitionMap);

  // Build state label ↔ ID maps
  const stateIdMap: Record<State, string> = {};
  const stateLabelMap: Record<string, State> = {};
  const acceptingLabels = new Set<State>();

  for (const state of states) {
    stateIdMap[state.label] = state.id;
    stateLabelMap[state.id] = state.label;
    if (acceptingStateIds.has(state.id)) {
      acceptingLabels.add(state.label);
    }
  }

  const startLabel = stateLabelMap[startStateId];
  if (!startLabel) {
    return {
      inputString,
      steps: [],
      accepted: false,
      completed: false,
      error: 'Start state not found in state set.',
    };
  }

  // Dispatch to the appropriate simulator
  if (automatonType === 'DFA') {
    return simulateDFA(
      inputString,
      startLabel,
      acceptingLabels,
      transitionMap,
      stateIdMap,
      transitions
    );
  } else {
    // NFA and ε-NFA both use the parallel tracking algorithm
    return simulateNFA(
      inputString,
      startLabel,
      acceptingLabels,
      transitionMap,
      stateIdMap,
      transitions
    );
  }
}
