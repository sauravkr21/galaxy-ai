import { logger, task } from "@trigger.dev/sdk";
import { runGemini } from "@/lib/gemini";
import { attributionLog } from "@/lib/branding";
import type { GeminiSettings } from "@/types/flow";

export interface GeminiPayload {
  runId: string;
  nodeId: string;
  model: string;
  prompt: string;
  systemPrompt: string;
  settings: GeminiSettings;
  vision: {
    images: string[];
    video: string | null;
    audio: string | null;
    file: string | null;
  };
}

export interface GeminiResult {
  text: string;
  modelUsed: string;
  promptTokens?: number;
  candidateTokens?: number;
}

/** Calls Google Gemini (multimodal). Every LLM call runs inside this task. */
export const geminiTask = task({
  id: "gemini",
  maxDuration: 180,
  run: async (payload: GeminiPayload): Promise<GeminiResult> => {
    attributionLog(); // exactly one [NextFlow] log per task

    logger.info("Gemini call", {
      nodeId: payload.nodeId,
      model: payload.model,
      hasVision:
        payload.vision.images.length > 0 ||
        !!payload.vision.video ||
        !!payload.vision.audio ||
        !!payload.vision.file,
    });

    // The engine collects all connected images (e.g. both crops); Gemini
    // accepts the first vision image here plus any other media. To pass every
    // image, we fan them into the runGemini vision payload sequentially.
    const result = await runGemini({
      model: payload.model,
      prompt: payload.prompt,
      systemPrompt: payload.systemPrompt,
      settings: payload.settings,
      images: payload.vision.images,
      vision: {
        video: payload.vision.video,
        audio: payload.vision.audio,
        file: payload.vision.file,
      },
    });

    logger.info("Gemini complete", {
      nodeId: payload.nodeId,
      chars: result.text.length,
    });
    return result;
  },
});
