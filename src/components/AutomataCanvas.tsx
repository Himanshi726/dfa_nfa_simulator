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
  activeTransitionIds: Set<string>;
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
  activeTransitionIds,
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

  // Group transitions by unordered pair of states so we can offset multiple edges
  const transitionGroups: Record<string, TransitionEntry[]> = {};
  for (const t of transitions) {
    const sortedKey = [t.fromStateId, t.toStateId].sort().join('::');
    if (!transitionGroups[sortedKey]) {
      transitionGroups[sortedKey] = [];
    }
    transitionGroups[sortedKey].push(t);
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
          {Object.entries(transitionGroups).map(([groupKey, groupTransitions]) => {
            const firstT = groupTransitions[0];
            const isSelfLoop = firstT.fromStateId === firstT.toStateId;

            if (isSelfLoop) {
              const fromState = stateMap.get(firstT.fromStateId);
              if (!fromState) return null;

              const label = groupTransitions.map(t => t.symbol).join(', ');

              // ─── Self-loop geometry ───────────────────────────────
              // Two anchor points on the state circle, symmetric about
              // the vertical axis, near the top of the state.
              const anchorAngle = Math.PI * 0.20; // ≈36° from top
              const leftAnchorX  = -STATE_RADIUS * Math.sin(anchorAngle);
              const leftAnchorY  = -STATE_RADIUS * Math.cos(anchorAngle);
              const rightAnchorX =  STATE_RADIUS * Math.sin(anchorAngle);
              const rightAnchorY = -STATE_RADIUS * Math.cos(anchorAngle);

              // Loop circle: sits above the state with clear separation.
              const loopRadius = 20;
              const loopGap = 8; // clearance above state edge
              const loopCx = 0;
              const loopCy = -(STATE_RADIUS + loopGap + loopRadius);

              // We draw a cubic Bézier from leftAnchor → up around → rightAnchor
              // Control points pull upward to create the loop shape.
              const cpOffset = loopRadius * 1.6;
              const cp1x = leftAnchorX - 8;
              const cp1y = loopCy - cpOffset * 0.3;
              const cp2x = rightAnchorX + 8;
              const cp2y = loopCy - cpOffset * 0.3;

              // Arrowhead direction: tangent at the rightAnchor end
              // (pointing downward-left into the state)
              const arrowDx = rightAnchorX - cp2x;
              const arrowDy = rightAnchorY - cp2y;
              const arrowAngle = Math.atan2(arrowDy, arrowDx);

              const isAnyActive = groupTransitions.some(t => activeTransitionIds.has(t.id));
              const highlightColor = "#f472b6"; // bright pink
              const normalColor = "#9d5084"; // plum
              const accentColor = "#fbcfe8"; // light pink for labels

              return (
                <Group key={groupKey} x={fromState.x} y={fromState.y}>
                  {/* Loop path: Bézier curve from left anchor over the top to right anchor */}
                  <Shape
                    sceneFunc={(context, shape) => {
                      context.beginPath();
                      // Start at left anchor on state circle
                      context.moveTo(leftAnchorX, leftAnchorY);
                      // Cubic bezier going up, over, and back down
                      context.bezierCurveTo(
                        leftAnchorX - 14, loopCy - loopRadius * 0.8,  // CP1: pull up-left
                        rightAnchorX + 14, loopCy - loopRadius * 0.8, // CP2: pull up-right
                        rightAnchorX, rightAnchorY                      // End at right anchor
                      );
                      context.strokeShape(shape);
                    }}
                    stroke={isAnyActive ? highlightColor : normalColor}
                    strokeWidth={isAnyActive ? 3 : 2}
                  />
                  {/* Arrowhead at the right anchor (re-entry point) */}
                  <Shape
                    sceneFunc={(context, shape) => {
                      const headLen = 10;
                      const headWidth = 8;

                      const tipX = rightAnchorX;
                      const tipY = rightAnchorY;

                      // Compute tangent at endpoint from last control point
                      const tx = tipX - (rightAnchorX + 14);
                      const ty = tipY - (loopCy - loopRadius * 0.8);
                      const tAngle = Math.atan2(ty, tx);

                      const leftX = tipX - headLen * Math.cos(tAngle) + (headWidth / 2) * Math.sin(tAngle);
                      const leftY = tipY - headLen * Math.sin(tAngle) - (headWidth / 2) * Math.cos(tAngle);
                      const rightX2 = tipX - headLen * Math.cos(tAngle) - (headWidth / 2) * Math.sin(tAngle);
                      const rightY2 = tipY - headLen * Math.sin(tAngle) + (headWidth / 2) * Math.cos(tAngle);

                      context.beginPath();
                      context.moveTo(tipX, tipY);
                      context.lineTo(leftX, leftY);
                      context.lineTo(rightX2, rightY2);
                      context.closePath();
                      context.fillShape(shape);
                    }}
                    fill={isAnyActive ? highlightColor : normalColor}
                  />
                  {/* Transition label above the loop */}
                  <Text
                    x={loopCx}
                    y={loopCy - loopRadius - 6}
                    text={label}
                    fontSize={13}
                    fontFamily="JetBrains Mono, monospace"
                    fill={isAnyActive ? highlightColor : accentColor}
                    fontStyle="bold"
                    width={120}
                    align="center"
                    offsetX={60}
                    offsetY={8}
                    shadowColor={isAnyActive ? highlightColor : "transparent"}
                    shadowBlur={isAnyActive ? 8 : 0}
                  />
                </Group>
              );
            }

            const [minId, maxId] = groupKey.split('::');
            const forwardEdges = groupTransitions.filter(t => t.fromStateId === minId);
            const backwardEdges = groupTransitions.filter(t => t.fromStateId === maxId);

            const edgesToDraw = [];
            if (forwardEdges.length > 0) {
              edgesToDraw.push({
                labels: forwardEdges.map(t => t.symbol).join(', '),
                t: forwardEdges[0]
              });
            }
            if (backwardEdges.length > 0) {
              edgesToDraw.push({
                labels: backwardEdges.map(t => t.symbol).join(', '),
                t: backwardEdges[0]
              });
            }

            // If we have arrows pointing both ways, bend them left (curvature = 1.0) relative to their own direction so they form an eye shape.
            const curvature = edgesToDraw.length === 2 ? 1.0 : 0;

              const isAnyActive = groupTransitions.some(t => activeTransitionIds.has(t.id));
              const highlightColor = "#f472b6"; // bright pink
              const normalColor = "#9d5084"; // plum
              const accentColor = "#fbcfe8"; // light pink for labels

              return edgesToDraw.map((edge) => {
                const fromState = stateMap.get(edge.t.fromStateId);
                const toState = stateMap.get(edge.t.toStateId);
                if (!fromState || !toState) return null;

                const { points, textX, textY } = computeArrowPoints(
                  fromState.x,
                  fromState.y,
                  toState.x,
                  toState.y,
                  STATE_RADIUS,
                  curvature
                );
                
                // Specific edge is active if any of its symbol transitions are active
                const isActive = groupTransitions
                  .filter(t => t.fromStateId === edge.t.fromStateId && t.toStateId === edge.t.toStateId)
                  .some(t => activeTransitionIds.has(t.id));

                return (
                  <Group key={`${edge.t.fromStateId}-${edge.t.toStateId}`}>
                    <Arrow
                      points={points}
                      pointerLength={ARROW_HEAD_SIZE}
                      pointerWidth={ARROW_HEAD_SIZE}
                      fill={isActive ? highlightColor : normalColor}
                      stroke={isActive ? highlightColor : normalColor}
                      strokeWidth={isActive ? 3 : 2}
                      tension={curvature !== 0 ? 0.5 : 0}
                      lineCap="round"
                      lineJoin="round"
                      shadowColor={isActive ? highlightColor : "transparent"}
                      shadowBlur={isActive ? 10 : 0}
                    />
                    {/* Transition label */}
                    <Text
                      x={textX - edge.labels.length * 4}
                      y={textY}
                      text={edge.labels}
                      fontSize={13}
                      fontFamily="JetBrains Mono, monospace"
                      fill={isActive ? highlightColor : accentColor}
                      fontStyle="bold"
                      shadowColor={isActive ? highlightColor : "transparent"}
                      shadowBlur={isActive ? 8 : 0}
                    />
                  </Group>
                );
              });
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
                fill="#db2777"
                stroke="#db2777"
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
                    stroke="#f472b6"
                    strokeWidth={3}
                    opacity={0.6}
                    shadowColor="#f472b6"
                    shadowBlur={20}
                    shadowOpacity={0.5}
                  />
                )}

                {/* Outer circle for accepting states (double circle) */}
                {state.isAccepting && (
                  <Circle
                    radius={STATE_RADIUS + 5}
                    stroke={isActive ? '#f472b6' : '#db2777'}
                    strokeWidth={2}
                    fill="transparent"
                  />
                )}

                {/* Main state circle */}
                <Circle
                  radius={STATE_RADIUS}
                  fill={
                    isActive
                      ? 'rgba(244, 114, 182, 0.15)'
                      : 'rgba(66, 32, 58, 0.95)'
                  }
                  stroke={
                    isActive
                      ? '#f472b6'
                      : isStart
                      ? '#db2777'
                      : '#703b5f'
                  }
                  strokeWidth={isActive ? 3 : 2}
                  shadowColor={
                    isActive
                      ? '#f472b6'
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
                  fill={isActive ? '#fdf2f8' : '#fbcfe8'}
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
              stroke="#db2777"
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
            background: 'rgba(219, 39, 119, 0.15)',
            border: '1px solid rgba(219, 39, 119, 0.4)',
            borderRadius: 10,
            padding: '8px 20px',
            color: '#fbcfe8',
            fontSize: '0.8rem',
            fontWeight: 600,
            zIndex: 5,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          Click a target state to create transition · <kbd style={{ fontSize: '0.7rem', background: '#331a2d', padding: '2px 6px', borderRadius: '4px', border: '1px solid #703b5f' }}>Esc</kbd> to cancel
        </div>
      )}
    </div>
  );
};

function loopLabelOffset(symbolCount: number): number {
  return symbolCount > 2 ? 32 : 26;
}
