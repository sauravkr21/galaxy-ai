"use client";

import { upload } from "@vercel/blob/client";

/**
 * Uploads a file to Vercel Blob directly from the browser. The `/api/upload`
 * route authorises the request and mints a client token (the Blob token never
 * reaches the browser); the file then streams straight to Blob storage and the
 * public URL is returned.
 */
export async function uploadFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  onProgress?.(10);
  const blob = await upload(file.name, file, {
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
