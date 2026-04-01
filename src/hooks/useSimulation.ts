/**
 * useSimulation.ts — Custom React hook for controlling the step-by-step
 * simulation of the automaton on an input string.
 * 
 * Provides playback controls: Play, Pause, Step Forward, Step Backward, Reset.
 * Delegates actual computation to the AutomataEngine.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  StateNode,
  TransitionEntry,
  SimulationResult,
  SimulationStep,
} from '../core/types';
import { simulate } from '../core/AutomataEngine';

export type SimulationStatus = 'idle' | 'ready' | 'running' | 'paused' | 'finished';

export interface SimulationState {
  /** Current input string being simulated */
  inputString: string;
  /** Full simulation result (all steps pre-computed) */
  result: SimulationResult | null;
  /** Current step index being displayed */
  currentStepIndex: number;
  /** Current step data */
  currentStep: SimulationStep | null;
  /** Playback status */
  status: SimulationStatus;
  /** Set of currently active state IDs (for highlighting) */
  activeStateIds: Set<string>;
  /** Playback speed in milliseconds */
  playbackSpeed: number;
}

export interface SimulationActions {
  /** Set the input string */
  setInputString: (input: string) => void;
  /** Run the simulation (pre-compute all steps) */
  runSimulation: () => void;
  /** Step forward one step */
  stepForward: () => void;
  /** Step backward one step */
  stepBackward: () => void;
  /** Play the simulation automatically */
  play: () => void;
  /** Pause automatic playback */
  pause: () => void;
  /** Reset to the beginning */
  reset: () => void;
  /** Set playback speed */
  setPlaybackSpeed: (speed: number) => void;
}

export function useSimulation(
  states: StateNode[],
  transitions: TransitionEntry[],
  startStateId: string | null,
  acceptingStateIds: Set<string>
): SimulationState & SimulationActions {
  const [inputString, setInputString] = useState('');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [status, setStatus] = useState<SimulationStatus>('idle');
  const [playbackSpeed, setPlaybackSpeed] = useState(800);

  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derive current step and active states from result + index
  const currentStep =
    result && currentStepIndex >= 0 && currentStepIndex < result.steps.length
      ? result.steps[currentStepIndex]
      : null;

  const activeStateIds = currentStep?.activeStateIds ?? new Set<string>();

  /** Pre-compute all simulation steps using the engine */
  const runSimulation = useCallback(() => {
    // Stop any existing playback
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }

    const simResult = simulate(
      inputString,
      states,
      transitions,
      startStateId,
      acceptingStateIds
    );

    setResult(simResult);
    setCurrentStepIndex(0);
    setStatus(simResult.completed ? 'ready' : 'idle');
  }, [inputString, states, transitions, startStateId, acceptingStateIds]);

  /** Move to the next step in the trace */
  const stepForward = useCallback(() => {
    if (!result) return;

    setCurrentStepIndex((prev) => {
      const next = prev + 1;
      if (next >= result.steps.length) {
        setStatus('finished');
        // Stop auto-play if running
        if (playIntervalRef.current) {
          clearInterval(playIntervalRef.current);
          playIntervalRef.current = null;
        }
        return prev;
      }
      return next;
    });
  }, [result]);

  /** Move to the previous step in the trace */
  const stepBackward = useCallback(() => {
    if (!result) return;

    setCurrentStepIndex((prev) => {
      if (prev <= 0) return 0;
      setStatus('ready');
      return prev - 1;
    });
  }, [result]);

  /** Begin automatic playback at the configured speed */
  const play = useCallback(() => {
    if (!result) return;

    setStatus('running');

    // Clear existing interval
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }

    playIntervalRef.current = setInterval(() => {
      setCurrentStepIndex((prev) => {
        const next = prev + 1;
        if (next >= result.steps.length) {
          setStatus('finished');
          if (playIntervalRef.current) {
            clearInterval(playIntervalRef.current);
            playIntervalRef.current = null;
          }
          return prev;
        }
        return next;
      });
    }, playbackSpeed);
  }, [result, playbackSpeed]);

  /** Pause automatic playback */
  const pause = useCallback(() => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    setStatus('paused');
  }, []);

  /** Reset simulation to initial state */
  const reset = useCallback(() => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    setResult(null);
    setCurrentStepIndex(-1);
    setStatus('idle');
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);

  return {
    inputString,
    result,
    currentStepIndex,
    currentStep,
    status,
    activeStateIds,
    playbackSpeed,
    setInputString,
    runSimulation,
    stepForward,
    stepBackward,
    play,
    pause,
    reset,
    setPlaybackSpeed,
  };
}
