import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** Resolve the Clerk user id or throw a 401-shaped error. */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new ApiError(401, "Unauthorized");
  return userId;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function handleError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[api] unexpected error", err);
  const message = err instanceof Error ? err.message : "Internal error";
  return NextResponse.json({ error: message }, { status: 500 });
}

export function isLocalExecutor(): boolean {
  // Default to Trigger.dev unless explicitly opted into local in-process runs,
  // or no Trigger secret is configured.
  if (process.env.LOCAL_EXECUTOR === "1") return true;
  const key = process.env.TRIGGER_SECRET_KEY;
  return !key || key.includes("placeholder") || key === "tr_dev_xxx";
}
