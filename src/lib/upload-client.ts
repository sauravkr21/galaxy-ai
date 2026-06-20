"use client";

interface SignedParams {
  params: string;
  signature: string;
  authKey: string;
}

/**
 * Uploads a file to Transloadit from the browser using signed params minted by
 * `/api/transloadit/params`, then polls the assembly until it completes and
 * returns the resulting hosted URL.
 */
export async function uploadToTransloadit(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const signed: SignedParams = await fetch("/api/transloadit/params").then(
    (r) => {
      if (!r.ok) throw new Error("Could not get upload credentials.");
      return r.json();
    },
  );

  const form = new FormData();
  form.append("params", signed.params);
  form.append("signature", signed.signature);
  form.append("file", file);

  onProgress?.(10);
  const create = await fetch("https://api2.transloadit.com/assemblies", {
    method: "POST",
    body: form,
  });
  if (!create.ok) throw new Error("Upload failed to start.");
  let assembly = await create.json();

  // Poll until the assembly completes.
  const url: string = assembly.assembly_ssl_url;
  let attempts = 0;
  while (
    assembly.ok !== "ASSEMBLY_COMPLETED" &&
    assembly.error == null &&
    attempts < 60
  ) {
    await new Promise((r) => setTimeout(r, 1000));
    assembly = await fetch(url).then((r) => r.json());
    onProgress?.(Math.min(90, 10 + attempts * 5));
    attempts++;
  }
  if (assembly.error) throw new Error(assembly.error);

  // Prefer a processed result, else the original upload.
  const results = assembly.results ?? {};
  const firstStep = Object.keys(results)[0];
  const resultUrl =
    results[firstStep]?.[0]?.ssl_url ??
    assembly.uploads?.[0]?.ssl_url ??
    null;
  if (!resultUrl) throw new Error("Upload completed but no URL was returned.");
  onProgress?.(100);
  return resultUrl as string;
}
