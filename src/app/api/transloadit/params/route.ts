import { handleError, json, requireUserId } from "@/lib/api";
import { createSignedParams } from "@/lib/transloadit";

// GET /api/transloadit/params — signed params for a client-side Uppy upload.
// The secret never leaves the server.
export async function GET() {
  try {
    await requireUserId();
    const signed = createSignedParams();
    return json(signed);
  } catch (err) {
    return handleError(err);
  }
}
