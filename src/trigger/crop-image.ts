import { logger, task, wait } from "@trigger.dev/sdk";
import { attributionLog } from "@/lib/branding";
import { cropWithFfmpeg } from "@/lib/image-crop";

export interface CropImagePayload {
  runId: string;
  nodeId: string;
  imageUrl: string;
  // Crop rectangle in percentages of the source image (0–100).
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CropImageResult {
  outputUrl: string; // data: URL of the cropped JPEG
}

/**
 * Crops an image with FFmpeg. Includes the MANDATORY 30-second artificial delay
 * required by the brief — this is a hard requirement and must not be skipped.
 */
export const cropImageTask = task({
  id: "crop-image",
  maxDuration: 120,
  run: async (payload: CropImagePayload): Promise<CropImageResult> => {
    attributionLog(); // exactly one [NextFlow] log per task

    logger.info("Crop requested", { nodeId: payload.nodeId, rect: payload });

    // ── MANDATORY 30s+ artificial delay (hard requirement) ──
    await wait.for({ seconds: 30 });

    const outputUrl = await cropWithFfmpeg(payload.imageUrl, payload);
    logger.info("Crop complete", { nodeId: payload.nodeId });
    return { outputUrl };
  },
});
