/**
 * presets.ts — Pre-built automaton configurations for demonstration and testing.
 * 
 * Each preset showcases a different aspect of finite automata theory:
 *   1. "Ends with 01" — A classic DFA pattern matching example
 *   2. "Even number of 1s" — DFA demonstrating parity checking
 *   3. "NFA with ε-transitions" — Demonstrates non-determinism and epsilon closure
 */

import type { AutomatonPreset } from './types';
import { EPSILON } from './types';

export const PRESETS: AutomatonPreset[] = [
  {
    name: 'Ends with 01',
    description: 'DFA that accepts binary strings ending with "01"  —  L = { w ∈ {0,1}* | w ends with 01 }',
    type: 'DFA',
    testStrings: [
      { input: '01', expected: true },
      { input: '101', expected: true },
      { input: '001', expected: true },
      { input: '0101', expected: true },
      { input: '10', expected: false },
      { input: '1', expected: false },
      { input: '00', expected: false },
      { input: '', expected: false },
    ],
    states: [
      { id: 'p-s0', label: 'q₀', x: 150, y: 250, isAccepting: false, isStart: true },
      { id: 'p-s1', label: 'q₁', x: 400, y: 250, isAccepting: false, isStart: false },
      { id: 'p-s2', label: 'q₂', x: 650, y: 250, isAccepting: true, isStart: false },
    ],
    transitions: [
      { id: 'p-t0', fromStateId: 'p-s0', toStateId: 'p-s0', symbol: '1' },
      { id: 'p-t1', fromStateId: 'p-s0', toStateId: 'p-s1', symbol: '0' },
      { id: 'p-t2', fromStateId: 'p-s1', toStateId: 'p-s1', symbol: '0' },
      { id: 'p-t3', fromStateId: 'p-s1', toStateId: 'p-s2', symbol: '1' },
      { id: 'p-t4', fromStateId: 'p-s2', toStateId: 'p-s1', symbol: '0' },
      { id: 'p-t5', fromStateId: 'p-s2', toStateId: 'p-s0', symbol: '1' },
    ],
  },
  {
    name: 'Even number of 1s',
    description: 'DFA that accepts binary strings with an even number of 1s  —  L = { w ∈ {0,1}* | #₁(w) ≡ 0 (mod 2) }',
    type: 'DFA',
    testStrings: [
      { input: '', expected: true },
      { input: '0', expected: true },
      { input: '11', expected: true },
      { input: '0110', expected: true },
      { input: '1', expected: false },
      { input: '10', expected: false },
      { input: '111', expected: false },
    ],
    states: [
      { id: 'p-s0', label: 'q₀', x: 250, y: 250, isAccepting: true, isStart: true },
      { id: 'p-s1', label: 'q₁', x: 550, y: 250, isAccepting: false, isStart: false },
    ],
    transitions: [
      { id: 'p-t0', fromStateId: 'p-s0', toStateId: 'p-s0', symbol: '0' },
      { id: 'p-t1', fromStateId: 'p-s0', toStateId: 'p-s1', symbol: '1' },
      { id: 'p-t2', fromStateId: 'p-s1', toStateId: 'p-s1', symbol: '0' },
      { id: 'p-t3', fromStateId: 'p-s1', toStateId: 'p-s0', symbol: '1' },
    ],
  },
  {
    name: 'NFA with ε-transitions',
    description: 'ε-NFA that accepts strings containing "01" or "10" as a substring  —  L = { w ∈ {0,1}* | 01 ⊆ w ∨ 10 ⊆ w }',
    type: 'ε-NFA',
    testStrings: [
      { input: '01', expected: true },
      { input: '10', expected: true },
      { input: '010', expected: true },
      { input: '101', expected: true },
      { input: '0', expected: false },
      { input: '1', expected: false },
      { input: '', expected: false },
      { input: '00', expected: false },
      { input: '11', expected: false },
    ],
    states: [
      { id: 'p-s0', label: 'q₀', x: 100, y: 250, isAccepting: false, isStart: true },
      { id: 'p-s1', label: 'q₁', x: 300, y: 120, isAccepting: false, isStart: false },
      { id: 'p-s2', label: 'q₂', x: 500, y: 120, isAccepting: false, isStart: false },
      { id: 'p-s3', label: 'q₃', x: 700, y: 120, isAccepting: true, isStart: false },
      { id: 'p-s4', label: 'q₄', x: 300, y: 380, isAccepting: false, isStart: false },
      { id: 'p-s5', label: 'q₅', x: 500, y: 380, isAccepting: false, isStart: false },
      { id: 'p-s6', label: 'q₆', x: 700, y: 380, isAccepting: true, isStart: false },
    ],
    transitions: [
      // Branch 1: recognizes "01"
      { id: 'p-t0', fromStateId: 'p-s0', toStateId: 'p-s1', symbol: EPSILON },
      { id: 'p-t1', fromStateId: 'p-s1', toStateId: 'p-s2', symbol: '0' },
      { id: 'p-t2', fromStateId: 'p-s2', toStateId: 'p-s3', symbol: '1' },
      { id: 'p-t3', fromStateId: 'p-s3', toStateId: 'p-s3', symbol: '0' },
      { id: 'p-t4', fromStateId: 'p-s3', toStateId: 'p-s3', symbol: '1' },
      // Branch 2: recognizes "10"
      { id: 'p-t5', fromStateId: 'p-s0', toStateId: 'p-s4', symbol: EPSILON },
      { id: 'p-t6', fromStateId: 'p-s4', toStateId: 'p-s5', symbol: '1' },
      { id: 'p-t7', fromStateId: 'p-s5', toStateId: 'p-s6', symbol: '0' },
      { id: 'p-t8', fromStateId: 'p-s6', toStateId: 'p-s6', symbol: '0' },
      { id: 'p-t9', fromStateId: 'p-s6', toStateId: 'p-s6', symbol: '1' },
    ],
  },
];
