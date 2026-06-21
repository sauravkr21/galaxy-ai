import { z } from "zod";
import { GEMINI_MODELS } from "@/types/flow";

// ── Node data schemas ──

const runState = z.enum(["idle", "queued", "running", "completed", "failed"]);

const requestField = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["text", "image"]),
  value: z.string().nullable(),
});

// Strict new shape. Legacy DB workflows are migrated in the store on load
// (the client always sends this shape back), so the API never sees old data.
const requestInputsData = z.object({
  label: z.string(),
  fields: z.array(requestField),
  runState,
});

const cropImageData = z.object({
  label: z.string(),
  // May be an https URL (Transloadit) or a data: URL produced by an upstream crop.
  imageUrl: z.string().nullable(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  w: z.number().min(0).max(100),
  h: z.number().min(0).max(100),
  outputUrl: z.string().nullable(),
  runState,
});

const geminiData = z.object({
  label: z.string(),
  model: z.enum(GEMINI_MODELS),
  prompt: z.string(),
  systemPrompt: z.string(),
  vision: z.object({
    image: z.string().nullable(),
    video: z.string().nullable(),
    audio: z.string().nullable(),
    file: z.string().nullable(),
  }),
  settings: z.object({
    temperature: z.number().min(0).max(2),
    maxOutputTokens: z.number().int().positive().max(32768),
    topP: z.number().min(0).max(1),
  }),
  response: z.string().nullable(),
  runState,
});

const responseData = z.object({
  label: z.string(),
  resultKey: z.string(),
  result: z.string().nullable(),
  keys: z.record(z.string()).optional(),
  runState,
});

const stickyData = z.object({
  label: z.string(),
  text: z.string(),
  runState,
});

export const flowNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["request-inputs", "crop-image", "gemini", "response", "sticky"]),
  position: z.object({ x: z.number(), y: z.number() }),
  // Discriminating per-type would be stricter, but the union keeps import lenient.
  data: z.union([requestInputsData, cropImageData, geminiData, responseData, stickyData]),
});

export const flowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  sourceHandle: z.string(),
  target: z.string(),
  targetHandle: z.string(),
});

export const workflowGraphSchema = z.object({
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
  viewport: z
    .object({ x: z.number(), y: z.number(), zoom: z.number() })
    .optional(),
});

// ── API payloads ──

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  graph: workflowGraphSchema.optional(),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  status: z
    .enum(["DRAFT", "READY", "RUNNING", "COMPLETED", "FAILED"])
    .optional(),
  graph: workflowGraphSchema.optional(),
  thumbnailUrl: z.string().nullable().optional(),
});

export const startRunSchema = z.object({
  mode: z.enum(["full", "single", "multi"]).default("full"),
  targetNodeIds: z.array(z.string()).default([]),
  // The client sends the current graph so the run snapshots exactly what's on canvas.
  graph: workflowGraphSchema,
});

export const importWorkflowSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  graph: workflowGraphSchema,
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
export type StartRunInput = z.infer<typeof startRunSchema>;
