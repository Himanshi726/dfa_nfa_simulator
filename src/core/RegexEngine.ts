/**
 * RegexEngine.ts — Orchestrator for Regex → ε-NFA conversion.
 *
 * Ties together the RegexParser and ThompsonConstruction modules,
 * providing a single entry point for the UI layer.
 */

import { parseRegex, astToString, RegexParseError } from './RegexParser';
import { thompsonConstruction } from './ThompsonConstruction';
import { subsetConstruction } from './SubsetConstruction';
import type { StateNode, TransitionEntry } from './types';

export interface RegexCompileResult {
  /** Whether compilation succeeded */
  success: boolean;
  /** Generated states (empty on error) */
  states: StateNode[];
  /** Generated transitions (empty on error) */
  transitions: TransitionEntry[];
  /** Start state ID */
  startStateId: string | null;
  /** Accepting state IDs */
  acceptingStateIds: Set<string>;
  /** Human-readable parsed regex string */
  parsedString: string;
  /** Error message if compilation failed */
  error?: string;
  /** Position of the error in the pattern (for highlighting) */
  errorPosition?: number;
}

/**
 * Common helper for regex compilation (parsing + AST stringify)
 */
function parseAndPreprocess(pattern: string): { success: boolean; ast?: any; parsedString: string; error?: string; errorPosition?: number } {
  if (!pattern || pattern.trim().length === 0) {
    return { success: false, parsedString: '', error: 'Enter a regular expression pattern' };
  }

  try {
    const ast = parseRegex(pattern);
    const parsedString = astToString(ast);
    return { success: true, ast, parsedString };
  } catch (err) {
    if (err instanceof RegexParseError) {
      return { success: false, parsedString: '', error: err.message, errorPosition: err.position };
    }
    return { success: false, parsedString: '', error: `Unexpected error: ${(err as Error).message}` };
  }
}

/**
 * Compiles a regular expression pattern into an ε-NFA.
 */
export function compileRegex(pattern: string): RegexCompileResult {
  const prep = parseAndPreprocess(pattern);
  if (!prep.success) {
    return { success: false, states: [], transitions: [], startStateId: null, acceptingStateIds: new Set(), parsedString: prep.parsedString, error: prep.error, errorPosition: prep.errorPosition };
  }

  const result = thompsonConstruction(prep.ast);

  return {
    success: true,
    states: result.states,
    transitions: result.transitions,
    startStateId: result.startStateId,
    acceptingStateIds: new Set([result.acceptStateId]),
    parsedString: prep.parsedString,
  };
}

/**
 * Compiles a regular expression pattern directly into a DFA.
 * Sequence: Regex -> ε-NFA -> DFA
 */
export function compileRegexToDFA(pattern: string): RegexCompileResult {
  const prep = parseAndPreprocess(pattern);
  if (!prep.success) {
    return { success: false, states: [], transitions: [], startStateId: null, acceptingStateIds: new Set(), parsedString: prep.parsedString, error: prep.error, errorPosition: prep.errorPosition };
  }

  // Step 1: Thompson's Construction to get ε-NFA
  const nfaResult = thompsonConstruction(prep.ast);

  // Step 2: Subset Construction to get DFA
  const dfaResult = subsetConstruction(nfaResult.states, nfaResult.transitions);

  const startNode = dfaResult.states.find(s => s.isStart);
  const acceptingIds = new Set(dfaResult.states.filter(s => s.isAccepting).map(s => s.id));

  return {
    success: true,
    states: dfaResult.states,
    transitions: dfaResult.transitions,
    startStateId: startNode?.id ?? null,
    acceptingStateIds: acceptingIds,
    parsedString: prep.parsedString,
  };
}

