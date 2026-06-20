import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import type { GeminiSettings, GeminiVision } from "@/types/flow";

/**
 * Maps the friendly model names shown in the node header to concrete Google AI
 * Studio model ids. Adjust the right-hand side to whatever your API key has
 * access to without touching the UI.
 */
const MODEL_MAP: Record<string, string> = {
  "gemini-3.1-pro": process.env.GEMINI_DEFAULT_MODEL || "gemini-2.5-pro",
  "gemini-3.1-flash": "gemini-2.5-flash",
  "gemini-2.5-pro": "gemini-2.5-pro",
  "gemini-2.5-flash": "gemini-2.5-flash",
};

function resolveModel(model: string): string {
  return MODEL_MAP[model] ?? model;
}

/** Fetch a remote media URL and turn it into an inline Gemini Part. */
async function urlToPart(url: string): Promise<Part> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch media ${url}: ${res.status}`);
  const mimeType = res.headers.get("content-type") || "application/octet-stream";
  const buf = Buffer.from(await res.arrayBuffer());
  return { inlineData: { data: buf.toString("base64"), mimeType } };
}

export interface RunGeminiArgs {
  model: string;
  prompt: string;
  systemPrompt?: string;
  // `images` carries every connected image (e.g. both crops); `vision`
  // covers a single manual image plus other media.
  images?: string[];
  vision?: Partial<GeminiVision>;
  settings?: Partial<GeminiSettings>;
}

export interface RunGeminiResult {
  text: string;
  modelUsed: string;
  promptTokens?: number;
  candidateTokens?: number;
}

export async function runGemini(args: RunGeminiArgs): Promise<RunGeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelUsed = resolveModel(args.model);

  const model = genAI.getGenerativeModel({
    model: modelUsed,
    systemInstruction: args.systemPrompt?.trim() || undefined,
    generationConfig: {
      temperature: args.settings?.temperature ?? 0.7,
      maxOutputTokens: args.settings?.maxOutputTokens ?? 2048,
      topP: args.settings?.topP ?? 0.95,
    },
  });

  const parts: Part[] = [{ text: args.prompt }];
  const vision = args.vision ?? {};
  const mediaUrls = [
    ...(args.images ?? []),
    vision.image,
    vision.video,
    vision.audio,
    vision.file,
  ].filter((u): u is string => !!u);
  for (const url of mediaUrls) {
    parts.push(await urlToPart(url));
  }

  const result = await model.generateContent(parts);
  const usage = result.response.usageMetadata;
  return {
    text: result.response.text(),
    modelUsed,
    promptTokens: usage?.promptTokenCount,
    candidateTokens: usage?.candidatesTokenCount,
  };
}
