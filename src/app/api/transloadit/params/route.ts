import { handleError, json, requireUserId } from "@/lib/api";
import { createSignedParams, transloaditConfigured } from "@/lib/transloadit";

// GET /api/transloadit/params — signed params for a client-side upload.
// Returns { configured: false } when no real Transloadit credentials are set,
// so the client can fall back to Vercel Blob. The secret never leaves the server.
export async function GET() {
  try {
    await requireUserId();
    if (!transloaditConfigured()) {
      return json({ configured: false });
    }
    return json({ configured: true, ...createSignedParams() });
  } catch (err) {
    return handleError(err);
  }
}
