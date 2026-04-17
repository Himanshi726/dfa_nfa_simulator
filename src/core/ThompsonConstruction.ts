/**
 * ThompsonConstruction.ts — Thompson's Construction algorithm.
 *
 * Converts a Regex AST (from RegexParser) into an ε-NFA represented
 * as StateNode[] and TransitionEntry[] that plug directly into the
 * existing automata data model.
 *
 * Thompson's Construction guarantees:
 *   - Exactly one start state and one accept state per fragment
 *   - O(n) states for a regex of size n
 *   - No state has more than 2 outgoing transitions
 *
 * State auto-layout: States are positioned in a horizontal flow
 * with automatic spacing so they render nicely on the canvas.
 */

import { v4 as uuidv4 } from 'uuid';
import type { StateNode, TransitionEntry } from './types';
import { EPSILON } from './types';
import type { RegexNode } from './RegexParser';

// ─── NFA Fragment ────────────────────────────────────────────

interface NFAFragment {
  /** ID of the fragment's start state */
  startId: string;
  /** ID of the fragment's single accept state */
  acceptId: string;
  /** All states in this fragment */
  states: StateNode[];
  /** All transitions in this fragment */
  transitions: TransitionEntry[];
}

// ─── State Counter ───────────────────────────────────────────

let stateIndex = 0;

function resetCounter() {
  stateIndex = 0;
}

function makeState(x: number, y: number): StateNode {
  const id = uuidv4();
  const label = `q${stateIndex}`;
  stateIndex++;
  return {
    id,
    label,
    x,
    y,
    isAccepting: false,
    isStart: false,
  };
}

function makeTransition(fromId: string, toId: string, symbol: string): TransitionEntry {
  return {
    id: uuidv4(),
    fromStateId: fromId,
    toStateId: toId,
    symbol,
  };
}

// ─── Thompson's Construction ─────────────────────────────────

/**
 * Recursively builds an NFA fragment for each AST node.
 *
 * @param node - The regex AST node
 * @param baseX - Horizontal position hint for layout
 * @param baseY - Vertical position hint for layout  
 * @returns An NFAFragment
 */
function buildFragment(
  node: RegexNode,
  baseX: number,
  baseY: number
): NFAFragment {
  const SPACING_X = 160;
  const SPACING_Y = 120;

  switch (node.type) {

    // ─── LITERAL: start --a--> accept ──────────────────────
    case 'LITERAL': {
      const s = makeState(baseX, baseY);
      const a = makeState(baseX + SPACING_X, baseY);
      const t = makeTransition(s.id, a.id, node.value!);
      return {
        startId: s.id,
        acceptId: a.id,
        states: [s, a],
        transitions: [t],
      };
    }

    // ─── EPSILON: start --ε--> accept ──────────────────────
    case 'EPSILON': {
      const s = makeState(baseX, baseY);
      const a = makeState(baseX + SPACING_X, baseY);
      const t = makeTransition(s.id, a.id, EPSILON);
      return {
        startId: s.id,
        acceptId: a.id,
        states: [s, a],
        transitions: [t],
      };
    }

    // ─── CONCAT: wire r1.accept → r2.start ─────────────────
    case 'CONCAT': {
      const frag1 = buildFragment(node.left!, baseX, baseY);
      // Calculate the rightmost X in frag1 to position frag2
      const maxX1 = Math.max(...frag1.states.map(s => s.x));
      const frag2 = buildFragment(node.right!, maxX1 + SPACING_X, baseY);

      // Merge frag1.accept into frag2.start:
      // Redirect all transitions that go TO frag1.accept → frag2.start
      // Redirect all transitions that go FROM frag1.accept → FROM frag2.start
      // Instead, just add an ε-transition from frag1.accept to frag2.start
      const bridge = makeTransition(frag1.acceptId, frag2.startId, EPSILON);

      return {
        startId: frag1.startId,
        acceptId: frag2.acceptId,
        states: [...frag1.states, ...frag2.states],
        transitions: [...frag1.transitions, ...frag2.transitions, bridge],
      };
    }

    // ─── UNION: new start --ε--> r1, r2; both accepts --ε--> new accept
    case 'UNION': {
      const s = makeState(baseX, baseY);
      const frag1 = buildFragment(node.left!, baseX + SPACING_X, baseY - SPACING_Y);
      const frag2 = buildFragment(node.right!, baseX + SPACING_X, baseY + SPACING_Y);
      const maxX = Math.max(
        ...frag1.states.map(st => st.x),
        ...frag2.states.map(st => st.x)
      );
      const a = makeState(maxX + SPACING_X, baseY);

      const t1 = makeTransition(s.id, frag1.startId, EPSILON);
      const t2 = makeTransition(s.id, frag2.startId, EPSILON);
      const t3 = makeTransition(frag1.acceptId, a.id, EPSILON);
      const t4 = makeTransition(frag2.acceptId, a.id, EPSILON);

      return {
        startId: s.id,
        acceptId: a.id,
        states: [s, ...frag1.states, ...frag2.states, a],
        transitions: [
          ...frag1.transitions,
          ...frag2.transitions,
          t1, t2, t3, t4,
        ],
      };
    }

    // ─── STAR: new start --ε--> r.start + new accept
    //          r.accept --ε--> r.start (loop)
    //          r.accept --ε--> new accept
    //          new start --ε--> new accept (bypass)
    case 'STAR': {
      const s = makeState(baseX, baseY);
      const inner = buildFragment(node.operand!, baseX + SPACING_X, baseY);
      const maxX = Math.max(...inner.states.map(st => st.x));
      const a = makeState(maxX + SPACING_X, baseY);

      const t1 = makeTransition(s.id, inner.startId, EPSILON);
      const t2 = makeTransition(s.id, a.id, EPSILON);         // bypass
      const t3 = makeTransition(inner.acceptId, inner.startId, EPSILON); // loop back
      const t4 = makeTransition(inner.acceptId, a.id, EPSILON);

      return {
        startId: s.id,
        acceptId: a.id,
        states: [s, ...inner.states, a],
        transitions: [...inner.transitions, t1, t2, t3, t4],
      };
    }

    // ─── PLUS: same as STAR but without bypass (no s → a)
    case 'PLUS': {
      const s = makeState(baseX, baseY);
      const inner = buildFragment(node.operand!, baseX + SPACING_X, baseY);
      const maxX = Math.max(...inner.states.map(st => st.x));
      const a = makeState(maxX + SPACING_X, baseY);

      const t1 = makeTransition(s.id, inner.startId, EPSILON);
      const t3 = makeTransition(inner.acceptId, inner.startId, EPSILON); // loop back
      const t4 = makeTransition(inner.acceptId, a.id, EPSILON);

      return {
        startId: s.id,
        acceptId: a.id,
        states: [s, ...inner.states, a],
        transitions: [...inner.transitions, t1, t3, t4],
      };
    }

    // ─── OPTIONAL: same as UNION(r, ε) — with bypass
    case 'OPTIONAL': {
      const s = makeState(baseX, baseY);
      const inner = buildFragment(node.operand!, baseX + SPACING_X, baseY);
      const maxX = Math.max(...inner.states.map(st => st.x));
      const a = makeState(maxX + SPACING_X, baseY);

      const t1 = makeTransition(s.id, inner.startId, EPSILON);
      const t2 = makeTransition(s.id, a.id, EPSILON);         // bypass
      const t4 = makeTransition(inner.acceptId, a.id, EPSILON);

      return {
        startId: s.id,
        acceptId: a.id,
        states: [s, ...inner.states, a],
        transitions: [...inner.transitions, t1, t2, t4],
      };
    }

    default:
      throw new Error(`Unknown AST node type: ${(node as any).type}`);
  }
}

// ─── Public API ──────────────────────────────────────────────

export interface ThompsonResult {
  states: StateNode[];
  transitions: TransitionEntry[];
  startStateId: string;
  acceptStateId: string;
}

/**
 * Converts a regex AST into an ε-NFA using Thompson's Construction.
 *
 * @param ast - The root of the regex AST
 * @returns States and transitions ready to load into the simulator
 */
export function thompsonConstruction(ast: RegexNode): ThompsonResult {
  resetCounter();

  // Start building at a comfortable canvas position
  const CANVAS_MARGIN_X = 120;
  const CANVAS_CENTER_Y = 280;

  const fragment = buildFragment(ast, CANVAS_MARGIN_X, CANVAS_CENTER_Y);

  // Mark the start state
  const startState = fragment.states.find(s => s.id === fragment.startId);
  if (startState) {
    startState.isStart = true;
  }

  // Mark the accept state
  const acceptState = fragment.states.find(s => s.id === fragment.acceptId);
  if (acceptState) {
    acceptState.isAccepting = true;
  }

  return {
    states: fragment.states,
    transitions: fragment.transitions,
    startStateId: fragment.startId,
    acceptStateId: fragment.acceptId,
  };
}
