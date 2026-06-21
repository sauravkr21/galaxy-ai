import crypto from "crypto";

/**
 * Builds signed Transloadit params for a client-side upload. The browser never
 * sees the Transloadit secret — it requests these signed params from
 * `/api/transloadit/params`, then sends them with the file to Transloadit.
 * Signature uses HMAC-SHA384 over the JSON params, as Transloadit requires.
 */
export interface SignedTransloaditParams {
  params: string; // JSON string
  signature: string; // "sha384:<hex>"
  authKey: string;
}

// Known placeholder values that are not real Transloadit auth keys.
const PLACEHOLDER_KEYS = new Set(["", "magica3575", "your-key", "xxx"]);

/** True when real Transloadit credentials are configured (not placeholders). */
export function transloaditConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY ?? "";
  const secret = process.env.TRANSLOADIT_SECRET ?? "";
  return Boolean(secret) && !PLACEHOLDER_KEYS.has(key);
}

export function createSignedParams(opts?: {
  templateId?: string;
  expiresMs?: number;
}): SignedTransloaditParams {
  const authKey = process.env.NEXT_PUBLIC_TRANSLOADIT_KEY;
  const secret = process.env.TRANSLOADIT_SECRET;
  const templateId = opts?.templateId || process.env.TRANSLOADIT_TEMPLATE_ID;

  if (!authKey || !secret) {
    throw new Error("Transloadit credentials are not configured.");
  }

  const expires = new Date(Date.now() + (opts?.expiresMs ?? 60 * 60 * 1000));
  // Transloadit expects "YYYY/MM/DD HH:MM:SS+00:00" in UTC.
  const expiresStr = formatExpiry(expires);

  const params: Record<string, unknown> = {
    auth: { key: authKey, expires: expiresStr },
  };
  if (templateId) {
    params.template_id = templateId;
  } else {
    // No template configured — store the original upload so it gets a hosted
    // URL we can read back from the completed assembly.
    params.steps = {
      ":original": { robot: "/upload/handle" },
    };
  }

  const paramsJson = JSON.stringify(params);
  const signature =
    "sha384:" +
    crypto.createHmac("sha384", secret).update(paramsJson).digest("hex");

  return { params: paramsJson, signature, authKey };
}

function formatExpiry(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+00:00`
  );
}
