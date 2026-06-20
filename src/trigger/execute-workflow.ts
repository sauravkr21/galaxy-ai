import { logger, task } from "@trigger.dev/sdk";
import { executeRun } from "@/lib/run-workflow";

export interface ExecuteWorkflowPayload {
  runId: string;
}

/**
 * Orchestrates a whole run on Trigger.dev. Spawns the per-node crop/gemini
 * child tasks via the engine's promise-graph so independent branches run
 * concurrently and dependents start the moment their inputs are ready.
 */
export const executeWorkflowTask = task({
  id: "execute-workflow",
  maxDuration: 300,
  run: async (payload: ExecuteWorkflowPayload) => {
    logger.info("Executing workflow run", { runId: payload.runId });
    await executeRun(payload.runId, "trigger");
    return { runId: payload.runId };
  },
});
