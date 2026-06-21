"use client";

import { useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflow-store";

// Uniform animated purple edge (matches the reference).
const EDGE_COLOR = "#7c5cff";

/** Animated purple bezier edge with a hover-to-delete control. */
export function DataEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;
  const [hovered, setHovered] = useState(false);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const pushHistory = useWorkflowStore((s) => s.pushHistory);

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <g onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <BaseEdge id={id} path={path} style={{ stroke: EDGE_COLOR, strokeWidth: 2 }} />
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        className="cursor-pointer"
      />
      <EdgeLabelRenderer>
        {hovered && (
          <button
            type="button"
            aria-label="Delete edge"
            title="Delete connection"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              pushHistory();
              onEdgesChange([{ id, type: "remove" }]);
            }}
            onMouseEnter={() => setHovered(true)}
            className="nodrag nopan pointer-events-auto absolute flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-base font-bold leading-none text-white shadow-md transition hover:scale-105 hover:bg-rose-600"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            ×
          </button>
        )}
      </EdgeLabelRenderer>
    </g>
  );
}
