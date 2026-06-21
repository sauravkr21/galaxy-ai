// Domain types for the workflow graph. These are the single source of truth
// shared by the canvas, the Zustand store, the API routes (via Zod) and the
// Trigger.dev tasks.

export type NodeKind =
  | "request-inputs"
  | "crop-image"
  | "gemini"
  | "response"
  | "sticky";

/** Runtime status used to drive the pulsating glow + status badge. */
export type NodeRunState = "idle" | "queued" | "running" | "completed" | "failed";

/** Data carried on a handle, used for type-safe connection validation. */
export type PortType = "text" | "image" | "video" | "audio" | "file" | "any";

export interface PortDef {
  id: string;
  label: string;
  type: PortType;
}

// ── Per-node data payloads ──

// NOTE: the per-node data payloads are `type` aliases (not interfaces) so they
// satisfy React Flow's `Node<T extends Record<string, unknown>>` constraint via
// TypeScript's implicit index signatures.
export type RequestFieldType =
  | "text"
  | "number"
  | "boolean"
  | "image"
  | "audio"
  | "video"
  | "media"
  | "file";

export type RequestField = {
  id: string; // stable handle id (edges reference this)
  name: string; // editable display name, e.g. "text_field", "image_field_2"
  type: RequestFieldType;
  value: string | null;
};

export type RequestInputsData = {
  label: string;
  fields: RequestField[];
  runState: NodeRunState;
};

export type CropImageData = {
  label: string;
  /** Resolved at run time from the connected upstream image. */
  imageUrl: string | null;
  // Crop rectangle expressed in percentages of the source image (0–100).
  x: number;
  y: number;
  w: number;
  h: number;
  /** Result URL produced by the Trigger.dev crop task. */
  outputUrl: string | null;
  runState: NodeRunState;
};

export type GeminiSettings = {
  temperature: number;
  maxOutputTokens: number;
  topP: number;
};

export type GeminiVision = {
  image: string | null;
  video: string | null;
  audio: string | null;
  file: string | null;
};

export type GeminiData = {
  label: string;
  model: string;
  prompt: string;
  systemPrompt: string;
  vision: GeminiVision;
  settings: GeminiSettings;
  /** Inline LLM output shown in the node body. */
  response: string | null;
  runState: NodeRunState;
};

export type StickyData = {
  label: string;
  text: string;
  runState: NodeRunState;
};

export type ResponseData = {
  label: string;
  /** Identifier for the collected result, e.g. "gemini_3_1_pro". */
  resultKey: string;
  result: string | null;
  /** Per-incoming-connection custom key overrides, keyed by source node id.
   *  The Response node collects one row per connection (like the reference). */
  keys?: Record<string, string>;
  runState: NodeRunState;
};

export type NodeData =
  | RequestInputsData
  | CropImageData
  | GeminiData
  | ResponseData
  | StickyData;

export interface FlowNode<T = NodeData> {
  id: string;
  type: NodeKind;
  position: { x: number; y: number };
  data: T;
}

export interface FlowEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

export interface WorkflowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface WorkflowSummary {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  createdAt: string;
  nodeCount: number;
  thumbnailUrl: string | null;
}

// Only one model is offered in the node header, per spec.
export const GEMINI_MODELS = ["gemini-3.1-pro"] as const;

export type GeminiModel = (typeof GEMINI_MODELS)[number];

export const DEFAULT_GEMINI_MODEL: GeminiModel = "gemini-3.1-pro";
