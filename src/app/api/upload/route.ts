import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * Client-upload token endpoint for Vercel Blob. The browser calls
 * `upload(..., { handleUploadUrl: "/api/upload" })`; this route authorises the
 * request (Clerk) and mints a short-lived client token, so files stream
 * straight from the browser to Blob without hitting the 4.5 MB function-body
 * limit. Requires BLOB_READ_WRITE_TOKEN in the environment.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const { userId } = await auth();
        if (!userId) throw new Error("Unauthorized");
        return {
          // Accept the media the canvas nodes support (image/video/audio/file).
          allowedContentTypes: [
            "image/*",
            "video/*",
            "audio/*",
            "application/*",
            "text/*",
          ],
          addRandomSuffix: true,
          maximumSizeInBytes: 50 * 1024 * 1024, // 50 MB
        };
      },
      // Nothing to persist on completion — the canvas stores the returned URL.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
