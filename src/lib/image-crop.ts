import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Crops an image with FFmpeg using percentage coordinates and returns a
 * base64 `data:` URL. Shared by the Trigger.dev crop task and the local
 * executor so behaviour is identical in both modes.
 *
 * If FFmpeg isn't available (e.g. a serverless environment without the binary)
 * it returns the original image unchanged so the pipeline still flows.
 */
export async function cropWithFfmpeg(
  imageUrl: string,
  rect: CropRect,
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "nextflow-crop-"));
  const inPath = join(dir, "in");
  const outPath = join(dir, "out.jpg");
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    await writeFile(inPath, Buffer.from(await res.arrayBuffer()));

    const cropExpr = `crop=iw*${rect.w}/100:ih*${rect.h}/100:iw*${rect.x}/100:ih*${rect.y}/100`;
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      inPath,
      "-vf",
      cropExpr,
      "-frames:v",
      "1",
      outPath,
    ]);

    const out = await readFile(outPath);
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch (err) {
    // FFmpeg missing or failed — fall back to the source image.
    if (imageUrl) return imageUrl;
    throw err;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
