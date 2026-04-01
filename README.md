# Finite Automata Simulator

> An interactive, academically rigorous web application for constructing and simulating Deterministic and Non-Deterministic Finite Automata — built as a BTech Final Year Project in Theory of Computation.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Konva.js](https://img.shields.io/badge/Canvas-Konva.js-0D1B2A?style=flat-square)](https://konvajs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tests-Vitest-6E9F18?style=flat-square)](https://vitest.dev/)

---

## Overview

This simulator provides a direct, verifiable mapping between the **formal mathematical definition** of a finite automaton and its executable implementation. Every transition the engine computes can be traced back to a specific TypeScript function — there are no black-box automata libraries.

The project targets two audiences: students who need to *build* intuition about formal languages, and examiners who need to *verify* that the logic is theoretically sound.

---

## Features

### Canvas Editor
- Click-to-create states; drag-to-reposition with live arrow recalculation
- Directed transition arrows with `atan2`-based perimeter anchor points
- Bidirectional edge separation via configurable curvature offset
- Self-loop rendering via quadratic Bézier path
- Infinite pan and zoom (0.3× – 3.0×) with dot-grid alignment

### Custom Automata Engine (`AutomataEngine.ts`)
- **Zero external automata libraries** — all traversal logic written from scratch in TypeScript
- `dfaStep` / `dfaRun` — single-lookup deterministic traversal with dead-state detection
- `epsilonClosure` — BFS expansion over `ε`-transitions, returning a sorted, deduplicated state set
- `nfaRun` — subset construction simulation maintaining a `Set<State>` frontier at every step
- Full `SimulationResult` trace with per-step `currentStates`, `symbolConsumed`, and `isAccepting`

### Step-by-Step Simulation
- Character-level pointer advancing through the input string
- Controls: Reset `⏮`, Step Back `⏪`, Step Forward `⏩`, Run Full `⏭`, and variable-speed auto-play
- Active states highlighted on the canvas in real time; traversed transitions visually distinguished

### Academic Panel
- **Live 5-tuple display** rendered via KaTeX: $M = (Q,\ \Sigma,\ \delta,\ q_0,\ F)$
- Each component ($Q$, $\Sigma$, $F$, $q_0$) updates on every canvas edit — no cached strings
- Full **$\delta$ transition table** as an HTML grid; undefined transitions render as `—`

### Trace Table
- Scrollable execution log: Step · Symbol · Active States · Status
- Clicking any row syncs the canvas highlight and input-string pointer — bidirectional
- Status column: `Accepting` / `Rejecting` / `Processing` with semantic colour coding

### Preset Library
- Five typed `AutomatonWithLayout` presets, each with embedded `testCases[]` for programmatic verification:
  1. DFA — strings over `{a,b}` ending in `ab`
  2. DFA — binary strings divisible by 3
  3. NFA — strings containing `aa` or `bb`
  4. NFA with ε-transitions — `(a|b)*abb`
  5. DFA — even count of both `a` and `b`

---

## Architecture

```
src/
├── core/          # Pure TypeScript — zero UI imports
│   ├── Types.ts
│   └── AutomataEngine.ts
├── canvas/        # Konva.js rendering layer
├── hooks/         # useAutomata (useReducer), useSimulator
├── components/    # FormalDefinition, TraceTable, SimulationControls
└── data/          # Presets, serialization utilities
```

**Data flow is strictly unidirectional:** `useAutomata` → props → components. The engine has no knowledge of React or Konva; it accepts a plain `Automaton` object and returns a `SimulationResult`.

---

## Testing

```bash
vitest run --coverage
```

`AutomataEngine.ts` maintains **100% statement coverage** across 9 test cases covering DFA acceptance, mid-string rejection, NFA branching, ε-closure correctness, and edge cases.

---

## Quick Start

```bash
npm install
npm run dev
```

Requires Node 18+. No automata-specific npm packages are used in the logic core.

---

## License

MIT © 2025
