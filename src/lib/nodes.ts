import {
  CropImageData,
  GeminiData,
  NodeData,
  NodeKind,
  PortDef,
  PortType,
  RequestInputsData,
  ResponseData,
  StickyData,
  DEFAULT_GEMINI_MODEL,
} from "@/types/flow";

export interface NodeSpec {
  kind: NodeKind;
  title: string;
  /** Executable nodes run as Trigger.dev tasks; local nodes resolve in-process. */
  executable: boolean;
  inputs: PortDef[];
  outputs: PortDef[];
  description: string;
}

export const NODE_SPECS: Record<NodeKind, NodeSpec> = {
  "request-inputs": {
    kind: "request-inputs",
    title: "Request-Inputs",
    executable: false,
    description: "Single source of inputs that fans out to the rest of the graph.",
    inputs: [],
    outputs: [
      { id: "text_field", label: "text_field", type: "text" },
      { id: "image_field", label: "image_field", type: "image" },
    ],
  },
  "crop-image": {
    kind: "crop-image",
    title: "Crop Image",
    executable: true,
    description: "Crops an image to a rectangle. Runs as a Trigger.dev task.",
    inputs: [{ id: "input_image", label: "Input image", type: "image" }],
    outputs: [{ id: "output", label: "Output image", type: "image" }],
  },
  gemini: {
    kind: "gemini",
    title: "Gemini 3.1 Pro",
    executable: true,
    description: "Calls Google Gemini. Prompt is required; vision inputs are optional.",
    inputs: [
      { id: "prompt", label: "Prompt", type: "text" },
      { id: "system_prompt", label: "System Prompt", type: "text" },
      { id: "image", label: "Image (Vision)", type: "image" },
      { id: "video", label: "Video", type: "video" },
      { id: "audio", label: "Audio", type: "audio" },
      { id: "file", label: "File", type: "file" },
    ],
    outputs: [{ id: "response", label: "Response", type: "text" }],
  },
  response: {
    kind: "response",
    title: "Response",
    executable: false,
    description: "Collects the final workflow result. No output handle.",
    inputs: [{ id: "result", label: "result", type: "any" }],
    outputs: [],
  },
  sticky: {
    kind: "sticky",
    title: "Note",
    executable: false,
    description: "A canvas annotation. Not part of execution.",
    inputs: [],
    outputs: [],
  },
};

/**
 * Type-safe connection rule. A source port of type S may connect to a target
 * port of type T when the target is permissive (`any`) or the types match.
 */
/** Port type for a Request-Inputs output handle, derived from its dynamic
 *  field list (Request-Inputs outputs are not static in NODE_SPECS). */
export function requestFieldPortType(
  data: RequestInputsData,
  handleId: string,
): PortType | undefined {
  const f = data.fields?.find((x) => x.id === handleId);
  if (!f) return undefined;
  return f.type === "image" ? "image" : "text";
}

export function canConnect(sourceType: PortType, targetType: PortType): boolean {
  if (targetType === "any") return true;
  if (sourceType === "any") return true;
  return sourceType === targetType;
}

export function getPort(
  kind: NodeKind,
  handleId: string,
  direction: "source" | "target",
): PortDef | undefined {
  const spec = NODE_SPECS[kind];
  const ports = direction === "source" ? spec.outputs : spec.inputs;
  return ports.find((p) => p.id === handleId);
}

// ── Default data factories ──

export function defaultData(kind: NodeKind): NodeData {
  switch (kind) {
    case "request-inputs":
      return {
        label: "Request-Inputs",
        // Default fields keep the handle ids the sample + engine reference.
        fields: [
          { id: "text_field", name: "text_field", type: "text", value: "" },
          { id: "image_field", name: "image_field", type: "image", value: null },
        ],
        runState: "idle",
      } satisfies RequestInputsData;
    case "crop-image":
      return {
        label: "Crop Image",
        imageUrl: null,
        x: 0,
        y: 0,
        w: 100,
        h: 100,
        outputUrl: null,
        runState: "idle",
      } satisfies CropImageData;
    case "gemini":
      return {
        label: "Gemini 3.1 Pro",
        model: DEFAULT_GEMINI_MODEL,
        prompt: "",
        systemPrompt: "",
        vision: { image: null, video: null, audio: null, file: null },
        settings: { temperature: 0.7, maxOutputTokens: 2048, topP: 0.95 },
        response: null,
        runState: "idle",
      } satisfies GeminiData;
    case "response":
      return {
        label: "Response",
        resultKey: "result",
        result: null,
        keys: {},
        runState: "idle",
      } satisfies ResponseData;
    case "sticky":
      return { label: "Note", text: "", runState: "idle" } satisfies StickyData;
  }
}

/** Which Request-Inputs field / Gemini field a target handle maps to (for the
 *  "connected → greyed out" state). */
export function targetFieldFor(kind: NodeKind, handleId: string): string | null {
  if (kind === "gemini") {
    if (handleId === "prompt") return "prompt";
    if (handleId === "system_prompt") return "systemPrompt";
    if (["image", "video", "audio", "file"].includes(handleId)) return `vision.${handleId}`;
  }
  if (kind === "crop-image" && handleId === "input_image") return "imageUrl";
  if (kind === "response" && handleId === "result") return "result";
  return null;
}

export const NODE_ORDER: NodeKind[] = [
  "request-inputs",
  "crop-image",
  "gemini",
  "response",
];
