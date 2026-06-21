"use client";

import { upload as blobUpload } from "@vercel/blob/client";

interface SignedParams {
  configured: boolean;
  params?: string;
  signature?: string;
  authKey?: string;
}

/**
 * Uploads a file from the browser. Per the project spec, uploads go through
 * **Transloadit** whenever real credentials are configured; otherwise we fall
 * back to Vercel Blob so uploads still work. Returns the hosted URL.
 */
export async function uploadFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const signed: SignedParams = await fetch("/api/transloadit/params")
    .then((r) => (r.ok ? (r.json() as Promise<SignedParams>) : { configured: false }))
    .catch(() => ({ configured: false }));

  if (signed.configured && signed.params && signed.signature) {
    try {
      return await uploadViaTransloadit(file, signed, onProgress);
    } catch (e) {
      // Transloadit configured but failed — fall back so the user isn't blocked.
      console.warn("[upload] Transloadit failed, falling back to Vercel Blob:", e);
    }
  }
  return uploadViaBlob(file, onProgress);
}

/** Client-side Transloadit upload using server-signed params. */
async function uploadViaTransloadit(
  file: File,
  signed: SignedParams,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const form = new FormData();
  form.append("params", signed.params!);
  form.append("signature", signed.signature!);
  form.append("file", file);

  onProgress?.(10);
  const create = await fetch("https://api2.transloadit.com/assemblies", {
    method: "POST",
    body: form,
  });
  if (!create.ok) throw new Error("Transloadit upload failed to start.");
  let assembly = await create.json();
  if (assembly.error) throw new Error(assembly.error);

  // Poll until the assembly completes.
  const url: string = assembly.assembly_ssl_url;
  let attempts = 0;
  while (assembly.ok !== "ASSEMBLY_COMPLETED" && assembly.error == null && attempts < 60) {
    await new Promise((r) => setTimeout(r, 1000));
    assembly = await fetch(url).then((r) => r.json());
    onProgress?.(Math.min(90, 10 + attempts * 5));
    attempts++;
  }
  if (assembly.error) throw new Error(assembly.error);

  const results = assembly.results ?? {};
  const firstStep = Object.keys(results)[0];
  const resultUrl =
    results[firstStep]?.[0]?.ssl_url ?? assembly.uploads?.[0]?.ssl_url ?? null;
  if (!resultUrl) throw new Error("Transloadit completed but returned no URL.");
  onProgress?.(100);
  return resultUrl as string;
}

/** Client-side Vercel Blob upload via the `/api/upload` token route. */
async function uploadViaBlob(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  onProgress?.(10);
  const blob = await blobUpload(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
    contentType: file.type || undefined,
    onUploadProgress: onProgress
      ? (e) => onProgress(Math.min(99, Math.round(e.percentage)))
      : undefined,
  });
  onProgress?.(100);
  return blob.url;
}
