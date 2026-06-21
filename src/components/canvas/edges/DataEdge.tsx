"use client";

import {
  BaseEdge,
  getBezierPath,
  useStore,
  type EdgeProps,
} from "@xyflow/react";
import { getPort, requestFieldPortType } from "@/lib/nodes";
import type { NodeKind, PortType, RequestInputsData } from "@/types/flow";

const STROKE: Record<PortType, string> = {
  text: "#f59e0b",
  image: "#3b82f6",
  video: "#22c55e",
  audio: "#06b6d4",
  file: "#a855f7",
  any: "#ec4899",
};

/** Bezier edge whose colour is derived from the source port type, matching the
 *  reference (amber for text, violet for image/vision). */
export function DataEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, source, sourceHandleId } = props;

  const portType: PortType = useStore((s) => {
    const node = s.nodeLookup.get(source);
    if (!node) return "any";
    if (node.type === "request-inputs") {
      return (
        requestFieldPortType(node.data as RequestInputsData, sourceHandleId ?? "") ??
        "any"
      );
    }
    return getPort(node.type as NodeKind, sourceHandleId ?? "", "source")?.type ?? "any";
  });

  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={path}
      style={{ stroke: STROKE[portType], strokeWidth: 2 }}
    />
  );
}
