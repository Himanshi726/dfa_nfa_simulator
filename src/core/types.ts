/**
 * types.ts — Formal type definitions for Finite Automata
 * 
 * Based on the 5-tuple formalism: M = (Q, Σ, δ, q₀, F)
 * where:
 *   Q  = finite set of states
 *   Σ  = finite input alphabet
 *   δ  = transition function (Q × Σ → P(Q) for NFA, Q × Σ → Q for DFA)
 *   q₀ = initial/start state ∈ Q
 *   F  = set of accepting/final states ⊆ Q
 */

/** A state label identifier (e.g. "q0", "q1", "q2") */
export type State = string;

/** A single input symbol from the alphabet (e.g. "0", "1", "a", "b") */
export type AlphabetSymbol = string;

/** 
 * Epsilon symbol constant — represents the empty/null transition (ε).
 * Used in NFAs with epsilon-transitions (ε-NFA).
 */
export const EPSILON: AlphabetSymbol = 'ε';

/**
 * Transition map representing δ: Q × (Σ ∪ {ε}) → P(Q)
 * 
 * Structure: Record<fromState, Record<symbol, toStates[]>>
 * 
 * For DFA: each (state, symbol) pair maps to exactly one state (array of length 1)
 * For NFA: each (state, symbol) pair can map to multiple states
 * For ε-NFA: includes transitions on the EPSILON symbol
 */
export type TransitionMap = Record<State, Record<AlphabetSymbol, State[]>>;

/**
 * The automaton type classification
 */
export type AutomatonType = 'DFA' | 'NFA' | 'ε-NFA';

/**
 * Complete automaton definition — the mathematical 5-tuple M = (Q, Σ, δ, q₀, F)
 * extended with positional data for the visual canvas.
 */
export interface AutomatonDefinition {
  /** Q — The finite set of states */
  states: StateNode[];
  /** Σ — The input alphabet (derived from transitions) */
  alphabet: AlphabetSymbol[];
  /** δ — The transition function */
  transitions: TransitionEntry[];
  /** q₀ — The start state ID */
  startStateId: string | null;
  /** F — The set of accepting/final state IDs */
  acceptingStateIds: Set<string>;
  /** Classification of the automaton */
  type: AutomatonType;
}

/**
 * A visual state node on the canvas — combines the mathematical state
 * with positional/rendering data.
 */
export interface StateNode {
  /** Unique identifier for this state node */
  id: string;
  /** Display label (e.g. "q0", "q1") */
  label: State;
  /** Canvas X coordinate */
  x: number;
  /** Canvas Y coordinate */
  y: number;
  /** Whether this is an accepting/final state (∈ F) */
  isAccepting: boolean;
  /** Whether this is the start state (= q₀) */
  isStart: boolean;
}

/**
 * A single transition entry representing one edge in the δ function.
 * δ(fromState, symbol) ∋ toState
 */
export interface TransitionEntry {
  /** Unique identifier for this transition */
  id: string;
  /** Source state ID */
  fromStateId: string;
  /** Target state ID */
  toStateId: string;
  /** The symbol(s) that trigger this transition */
  symbol: AlphabetSymbol;
}

/**
 * A single step in the simulation trace.
 * Records which states are active after consuming each symbol.
 */
export interface SimulationStep {
  /** The index of this step (0-based) */
  stepIndex: number;
  /** The symbol consumed to reach this configuration */
  symbolConsumed: AlphabetSymbol | null;
  /** The set of currently active states (for NFA, may be multiple) */
  activeStateIds: Set<string>;
  /** Human-readable description of this step */
  description: string;
}

/**
 * Complete result of running a simulation on an input string.
 */
export interface SimulationResult {
  /** The input string that was simulated */
  inputString: string;
  /** Ordered array of simulation steps (trace) */
  steps: SimulationStep[];
  /** Whether the string is accepted (any final active state ∈ F) */
  accepted: boolean;
  /** Whether the simulation completed without errors */
  completed: boolean;
  /** Error message if simulation could not complete */
  error?: string;
}

/**
 * Preset automaton for demonstration/testing purposes.
 */
export interface AutomatonPreset {
  /** Display name for the preset */
  name: string;
  /** Description of the language recognized */
  description: string;
  /** The type of automaton */
  type: AutomatonType;
  /** Test strings to demonstrate acceptance/rejection */
  testStrings: { input: string; expected: boolean }[];
  /** The states to create */
  states: StateNode[];
  /** The transitions to create */
  transitions: TransitionEntry[];
}
