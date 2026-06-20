import { defineConfig } from "@trigger.dev/sdk";
import { ffmpeg } from "@trigger.dev/build/extensions/core";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";

export default defineConfig({
  // Project ref is not secret; hardcode so the CLI deploy/dev picks it up
  // (the CLI does not read .env for this), with an env override if needed.
  project: process.env.TRIGGER_PROJECT_REF || "proj_zahwasvneywhorifastz",
  runtime: "node",
  logLevel: "info",
  maxDuration: 300, // crop task waits 30s+, give headroom
  dirs: ["./src/trigger"],
  build: {
    extensions: [
      // Make the ffmpeg binary available to the crop task.
      ffmpeg(),
      // Generate the Prisma client inside the deployed image so the
      // orchestrator task can read/write the run + node-run rows.
      prismaExtension({ mode: "legacy", schema: "prisma/schema.prisma" }),
    ],
  },
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 2,
      factor: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      randomize: true,
    },
  },
});
