/**
 * AutomataCanvas.tsx — Interactive canvas for drawing finite automata.
 * 
 * Uses Konva.js (react-konva) for high-performance 2D rendering.
 * 
 * Features:
 *   - Click to add states
 *   - Drag states to reposition
 *   - Double-click to toggle accepting state
 *   - Right-click context menu for state actions
 *   - Curved arrows for transitions with Math.atan2 trigonometry
 *   - Self-loop arrows for same-state transitions
 *   - Active state highlighting during simulation
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Stage, Layer, Circle, Text, Arrow, Line, Group, Shape } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { StateNode, TransitionEntry } from '../core/types';

const STATE_RADIUS = 32;
const ARROW_HEAD_SIZE = 10;

interface CanvasProps {
  states: StateNode[];
  transitions: TransitionEntry[];
  activeStateIds: Set<string>;
  startStateId: string | null;
  onAddState: (x: number, y: number) => void;
  onMoveState: (id: string, x: number, y: number) => void;
  onContextMenu: (stateId: string, x: number, y: number) => void;
  onDoubleClickState: (stateId: string) => void;
  onSelectStatesForTransition: (fromId: string, toId: string) => void;
}

/**
 * Computes arrow anchor points on the periphery of state circles
 * using atan2 trigonometry to calculate the correct angle.
 */
function computeArrowPoints(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  radius: number,
  curvature: number = 0
): { points: number[]; textX: number; textY: number } {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (curvature === 0) {
    // Straight line: anchor on circle periphery
    const startX = fromX + radius * Math.cos(angle);
    const startY = fromY + radius * Math.sin(angle);
    const endX = toX - radius * Math.cos(angle);
    const endY = toY - radius * Math.sin(angle);

    const textX = (startX + endX) / 2;
    const textY = (startY + endY) / 2 - 14;

    return { points: [startX, startY, endX, endY], textX, textY };
  }

  // Curved line: offset the midpoint perpendicular to the direct line
  const perpAngle = angle + Math.PI / 2;
  const offset = curvature * Math.min(dist * 0.3, 60);

  const midX = (fromX + toX) / 2 + offset * Math.cos(perpAngle);
  const midY = (fromY + toY) / 2 + offset * Math.sin(perpAngle);

  // Calculate angles from source/target to the control point
  const angleFromStart = Math.atan2(midY - fromY, midX - fromX);
  const angleFromEnd = Math.atan2(midY - toY, midX - toX);

  const startX = fromX + radius * Math.cos(angleFromStart);
  const startY = fromY + radius * Math.sin(angleFromStart);
  const endX = toX + radius * Math.cos(angleFromEnd);
  const endY = toY + radius * Math.sin(angleFromEnd);

  return {
    points: [startX, startY, midX, midY, endX, endY],
    textX: midX,
    textY: midY - 14,
  };
}

/**
 * Groups transitions between the same pair of states and determines
 * curvature for bidirectional transitions to avoid overlap.
 */
function getTransitionGroups(transitions: TransitionEntry[]) {
  const groups: Record<
    string,
    { transitions: TransitionEntry[]; key: string; reverse: boolean }
  > = {};

  for (const t of transitions) {
    const key = [t.fromStateId, t.toStateId].sort().join('::');
    const isReverse = t.fromStateId > t.toStateId;

    if (!groups[key]) {
      groups[key] = { transitions: [], key, reverse: false };
    }
    groups[key].transitions.push(t);
  }

  // Detect bidirectional transitions
  const pairKeys = new Set<string>();
  for (const t of transitions) {
    const forwardKey = `${t.fromStateId}->${t.toStateId}`;
    const reverseKey = `${t.toStateId}->${t.fromStateId}`;
    pairKeys.add(forwardKey);
    if (pairKeys.has(reverseKey)) {
      // Mark this pair as bidirectional
      const groupKey = [t.fromStateId, t.toStateId].sort().join('::');
      if (groups[groupKey]) {
        groups[groupKey].reverse = true;
      }
    }
  }

  return groups;
}

export const AutomataCanvas: React.FC<CanvasProps> = ({
  states,
  transitions,
  activeStateIds,
  startStateId,
  onAddState,
  onMoveState,
  onContextMenu,
  onDoubleClickState,
  onSelectStatesForTransition,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [transitionMode, setTransitionMode] = useState(false);
  const [transitionFrom, setTransitionFrom] = useState<string | null>(null);

  // Track container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Handle canvas click to add a state
  const handleStageClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      // Only add state if clicking on empty area
      if (e.target === e.target.getStage()) {
        const stage = e.target.getStage();
        const pos = stage?.getPointerPosition();
        if (pos && !transitionMode) {
          onAddState(pos.x, pos.y);
        }
        if (transitionMode) {
          setTransitionMode(false);
          setTransitionFrom(null);
        }
      }
    },
    [onAddState, transitionMode]
  );

  // Handle state click in transition mode
  const handleStateClick = useCallback(
    (stateId: string) => {
      if (transitionMode && transitionFrom) {
        onSelectStatesForTransition(transitionFrom, stateId);
        setTransitionMode(false);
        setTransitionFrom(null);
      }
    },
    [transitionMode, transitionFrom, onSelectStatesForTransition]
  );

  // Enable transition mode when holding Shift
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTransitionMode(false);
        setTransitionFrom(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const stateMap = new Map(states.map((s) => [s.id, s]));

  // Group transitions by source-target pair for label merging
  const edgeLabels: Record<string, { symbols: string[]; transitions: TransitionEntry[] }> = {};
  for (const t of transitions) {
    const edgeKey = `${t.fromStateId}::${t.toStateId}`;
    if (!edgeLabels[edgeKey]) {
      edgeLabels[edgeKey] = { symbols: [], transitions: [] };
    }
    edgeLabels[edgeKey].symbols.push(t.symbol);
    edgeLabels[edgeKey].transitions.push(t);
  }

  // Detect bidirectional pairs
  const bidirectionalPairs = new Set<string>();
  for (const key of Object.keys(edgeLabels)) {
    const [from, to] = key.split('::');
    const reverseKey = `${to}::${from}`;
    if (from !== to && edgeLabels[reverseKey]) {
      bidirectionalPairs.add([from, to].sort().join('::'));
    }
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleStageClick}
        style={{ cursor: transitionMode ? 'crosshair' : 'default' }}
      >
        <Layer>
          {/* Render transition arrows */}
          {Object.entries(edgeLabels).map(([edgeKey, { symbols }]) => {
            const [fromId, toId] = edgeKey.split('::');
            const fromState = stateMap.get(fromId);
            const toState = stateMap.get(toId);
            if (!fromState || !toState) return null;

            // Self-loop
            if (fromId === toId) {
              const label = symbols.join(', ');
              const cx = fromState.x;
              const cy = fromState.y - STATE_RADIUS - 30;

              return (
                <Group key={edgeKey}>
                  <Shape
                    sceneFunc={(context, shape) => {
                      context.beginPath();
                      const loopRadius = 22;
                      const startAngle = -Math.PI * 0.75;
                      const endAngle = -Math.PI * 0.25;
                      
                      // Compute start point on state circle
                      const sx = fromState.x + STATE_RADIUS * Math.cos(-Math.PI * 0.7);
                      const sy = fromState.y + STATE_RADIUS * Math.sin(-Math.PI * 0.7);
                      
                      context.moveTo(sx, sy);
                      context.arc(
                        cx,
                        cy,
                        loopRadius,
                        Math.PI * 0.75,
                        Math.PI * 0.25,
                        true
                      );
                      
                      context.strokeShape(shape);
                    }}
                    stroke="#64748b"
                    strokeWidth={2}
                  />
                  {/* Arrow head for self-loop */}
                  <Arrow
                    points={[
                      fromState.x + STATE_RADIUS * Math.cos(-Math.PI * 0.3),
                      fromState.y + STATE_RADIUS * Math.sin(-Math.PI * 0.3) - 2,
                      fromState.x + STATE_RADIUS * Math.cos(-Math.PI * 0.3),
                      fromState.y + STATE_RADIUS * Math.sin(-Math.PI * 0.3),
                    ]}
                    pointerLength={8}
                    pointerWidth={8}
                    fill="#64748b"
                    stroke="#64748b"
                    strokeWidth={0}
                  />
                  <Text
                    x={cx - 20}
                    y={cy - loopLabelOffset(symbols.length)}
                    text={label}
                    fontSize={13}
                    fontFamily="JetBrains Mono, monospace"
                    fill="#f59e0b"
                    fontStyle="bold"
                    width={40}
                    align="center"
                  />
                </Group>
              );
            }

            // Regular transition
            const sortedKey = [fromId, toId].sort().join('::');
            const isBidir = bidirectionalPairs.has(sortedKey);
            const curvature = isBidir ? (fromId < toId ? 1 : -1) : 0;
            
            const { points, textX, textY } = computeArrowPoints(
              fromState.x,
              fromState.y,
              toState.x,
              toState.y,
              STATE_RADIUS,
              curvature
            );

            const label = symbols.join(', ');

            return (
              <Group key={edgeKey}>
                <Arrow
                  points={points}
                  pointerLength={ARROW_HEAD_SIZE}
                  pointerWidth={ARROW_HEAD_SIZE}
                  fill="#64748b"
                  stroke="#64748b"
                  strokeWidth={2}
                  tension={curvature !== 0 ? 0.5 : 0}
                  lineCap="round"
                  lineJoin="round"
                />
                {/* Transition label background */}
                <Text
                  x={textX - label.length * 4}
                  y={textY}
                  text={label}
                  fontSize={13}
                  fontFamily="JetBrains Mono, monospace"
                  fill="#f59e0b"
                  fontStyle="bold"
                />
              </Group>
            );
          })}

          {/* Start state arrow indicator */}
          {startStateId && stateMap.get(startStateId) && (() => {
            const startState = stateMap.get(startStateId)!;
            const arrowStartX = startState.x - STATE_RADIUS - 40;
            const arrowEndX = startState.x - STATE_RADIUS - 2;
            return (
              <Arrow
                key="start-arrow"
                points={[arrowStartX, startState.y, arrowEndX, startState.y]}
                pointerLength={10}
                pointerWidth={10}
                fill="#60a5fa"
                stroke="#60a5fa"
                strokeWidth={2}
              />
            );
          })()}

          {/* Render state circles */}
          {states.map((state) => {
            const isActive = activeStateIds.has(state.id);
            const isStart = state.id === startStateId;

            return (
              <Group
                key={state.id}
                x={state.x}
                y={state.y}
                draggable
                onDragEnd={(e) => {
                  onMoveState(state.id, e.target.x(), e.target.y());
                }}
                onDblClick={() => onDoubleClickState(state.id)}
                onClick={() => handleStateClick(state.id)}
                onContextMenu={(e) => {
                  e.evt.preventDefault();
                  const stage = e.target.getStage();
                  const pos = stage?.getPointerPosition();
                  if (pos) {
                    onContextMenu(state.id, pos.x, pos.y);
                  }
                }}
              >
                {/* Active state glow effect */}
                {isActive && (
                  <Circle
                    radius={STATE_RADIUS + 8}
                    fill="transparent"
                    stroke="#fbbf24"
                    strokeWidth={3}
                    opacity={0.6}
                    shadowColor="#fbbf24"
                    shadowBlur={20}
                    shadowOpacity={0.5}
                  />
                )}

                {/* Outer circle for accepting states (double circle) */}
                {state.isAccepting && (
                  <Circle
                    radius={STATE_RADIUS + 5}
                    stroke={isActive ? '#fbbf24' : '#60a5fa'}
                    strokeWidth={2}
                    fill="transparent"
                  />
                )}

                {/* Main state circle */}
                <Circle
                  radius={STATE_RADIUS}
                  fill={
                    isActive
                      ? 'rgba(251, 191, 36, 0.15)'
                      : 'rgba(30, 41, 59, 0.95)'
                  }
                  stroke={
                    isActive
                      ? '#fbbf24'
                      : isStart
                      ? '#60a5fa'
                      : '#475569'
                  }
                  strokeWidth={isActive ? 3 : 2}
                  shadowColor={
                    isActive
                      ? '#fbbf24'
                      : 'transparent'
                  }
                  shadowBlur={isActive ? 15 : 0}
                  shadowOpacity={0.4}
                />

                {/* State label */}
                <Text
                  text={state.label}
                  fontSize={15}
                  fontFamily="JetBrains Mono, monospace"
                  fontStyle="600"
                  fill={isActive ? '#fbbf24' : '#e2e8f0'}
                  align="center"
                  verticalAlign="middle"
                  offsetX={state.label.length * 4.5}
                  offsetY={7}
                />
              </Group>
            );
          })}

          {/* Transition mode indicator line */}
          {transitionMode && transitionFrom && stateMap.get(transitionFrom) && (
            <Line
              points={[
                stateMap.get(transitionFrom)!.x,
                stateMap.get(transitionFrom)!.y,
                stateMap.get(transitionFrom)!.x,
                stateMap.get(transitionFrom)!.y,
              ]}
              stroke="#60a5fa"
              strokeWidth={2}
              dash={[8, 4]}
              opacity={0.5}
            />
          )}
        </Layer>
      </Stage>

      {/* Canvas instruction overlay */}
      <div className="canvas-instructions">
        <span><kbd>Click</kbd> Add state</span>
        <span><kbd>Double-click</kbd> Toggle accepting</span>
        <span><kbd>Right-click</kbd> State options</span>
        <span><kbd>Drag</kbd> Move state</span>
      </div>

      {/* Transition mode overlay */}
      {transitionMode && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(59, 130, 246, 0.2)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: 8,
            padding: '6px 16px',
            color: '#60a5fa',
            fontSize: '0.8rem',
            fontWeight: 600,
            zIndex: 5,
          }}
        >
          Click a target state to create transition · <kbd style={{ fontSize: '0.7rem' }}>Esc</kbd> to cancel
        </div>
      )}
    </div>
  );
};

function loopLabelOffset(symbolCount: number): number {
  return symbolCount > 2 ? 32 : 26;
}
