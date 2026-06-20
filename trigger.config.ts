import { defineConfig } from "@trigger.dev/sdk/v3";
import { ffmpeg } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF || "proj_placeholder",
  runtime: "node",
  logLevel: "info",
  maxDuration: 300, // crop task waits 30s+, give headroom
  dirs: ["./src/trigger"],
  build: {
    // Make the ffmpeg binary available to the crop task.
    extensions: [ffmpeg()],
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
