# NextFlow — LLM Workflow Builder

A focused, pixel-faithful clone of the [Galaxy.ai](https://try.galaxy.ai/clone)
workflow builder, scoped to **LLM workflows**. Build visual DAGs on a React Flow
canvas, execute every node through **Trigger.dev**, run LLM steps on **Google
Gemini** (multimodal), and watch a live pulsating glow as independent branches
run concurrently.

> Three surfaces only: **Clerk auth**, **Dashboard**, **Workflow canvas**.
> No marketing pages — unauthenticated traffic is redirected to sign-in.

---

## Stack

| Concern        | Choice                                            |
| -------------- | ------------------------------------------------- |
| Framework      | Next.js 15 (App Router) · TypeScript (strict)     |
| Canvas         | React Flow (`@xyflow/react`)                       |
| State          | Zustand (+ undo/redo)                              |
| Auth           | Clerk (all routes protected)                       |
| LLM            | Google Gemini (`@google/generative-ai`)            |
| Execution      | Trigger.dev tasks (crop + gemini + orchestrator)   |
| Image crop     | FFmpeg (via Trigger.dev) — **mandatory 30s+ delay**|
| Uploads        | Transloadit (signed, client-side)                  |
| Database       | PostgreSQL (Neon) · Prisma                         |
| Validation     | Zod (every API route)                              |
| Styling        | Tailwind CSS                                        |

## The four node types

1. **Request-Inputs** — single source that fans out. Fields: `text_field`,
   `image_field` (uploaded via Transloadit). Local, not a task.
2. **Crop Image** — Trigger.dev task. FFmpeg crop with a **hard 30-second
   artificial delay** (`wait.for({ seconds: 30 })`).
3. **Gemini 3.1 Pro** — model selector in the header; `Prompt` (required),
   `System Prompt`, vision inputs (`Image`/`Video`/`Audio`/`File`), collapsible
   `Settings`, inline `Response`.
4. **Response** — collects the final `result`. No output handle.

Connections are **type-safe** (text→text, image→image/vision, `result` accepts
anything). A target field with an incoming edge is greyed out and shows
*connected*. The graph is validated as a DAG before every run.

## Execution model

Execution is a true dataflow DAG (`src/lib/engine.ts`): each node is a promise
that awaits only its **direct** upstream nodes, so:

- Crop #1, Crop #2 and Gemini #1 all start at **T=0** (concurrent).
- Gemini #2 starts the instant Gemini #1 finishes — it does **not** wait for the
  crops.
- The final Gemini waits for all of its upstreams (both crops + Gemini #2).
- Selective runs (single / multi) execute **only** the targeted nodes, reusing
  persisted upstream outputs.

Every executable node runs as a Trigger.dev task and logs exactly one line:

```
[NextFlow] Candidate LinkedIn: <your-linkedin-url>
```

(set via `CANDIDATE_LINKEDIN_URL`).

### Local executor

For local demos without a Trigger.dev cloud project, set `LOCAL_EXECUTOR=1`.
Runs then execute in-process using the **same engine** (real 30s crop delay,
real Gemini calls), and the canvas polls `/api/runs/:id` to drive the glow.
In production, leave it unset and set `TRIGGER_PROJECT_REF` so all executions go
through Trigger.dev.

---

## Setup

```bash
npm install
cp .env.example .env  # then fill in real values
npx prisma db push    # create tables on Neon
npm run dev           # http://localhost:3000
```

To run executions through Trigger.dev cloud (instead of local):

```bash
# set TRIGGER_PROJECT_REF and unset LOCAL_EXECUTOR in .env
npm run trigger:dev   # in a second terminal
```

### Environment variables

See [`.env.example`](./.env.example). Keys:

- **Neon**: `DATABASE_URL`, `DIRECT_URL` (the `postgresql://…` connection string).
- **Clerk**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
- **Gemini**: `GEMINI_API_KEY` (from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)),
  `GEMINI_DEFAULT_MODEL`. Friendly model names (e.g. `gemini-3.1-pro`) are mapped
  to real API models in `src/lib/gemini.ts` — edit the map for your key's access.
- **Trigger.dev**: `TRIGGER_PROJECT_REF`, `TRIGGER_SECRET_KEY`.
- **Transloadit**: `NEXT_PUBLIC_TRANSLOADIT_KEY`, `TRANSLOADIT_SECRET`,
  `TRANSLOADIT_TEMPLATE_ID` (optional).
- `CANDIDATE_LINKEDIN_URL`, `LOCAL_EXECUTOR`.

---

## Sample workflow

The dashboard **“Use sample”** button pre-builds the exact required DAG
(`src/lib/sample-workflow.ts`): Request-Inputs → 2× Crop → 3× Gemini (chained,
final with dual-crop vision) → Response.

## Features

- Dashboard CRUD: create / open / rename / delete, last-edited timestamps, status.
- Canvas: dot grid, MiniMap, pan/zoom/fit-view, undo/redo, autosave.
- Pulsating violet glow on running nodes; siblings pulse together.
- Animated, type-coloured edges (amber = text, violet = image/vision).
- Right-sidebar run history with per-node expand (input / output / logs / duration).
- JSON export / import (validated with Zod).

## Deploy (Vercel)

1. Push to a private GitHub repo.
2. Import into Vercel; add all env vars from `.env`.
3. Build command `npm run build` (runs `prisma generate`).
4. For Trigger.dev cloud execution, deploy tasks: `npx trigger.dev@latest deploy`.

## Project layout

```
src/
  app/                  # routes: sign-in, sign-up, dashboard, workflow/[id], api/*
  components/
    canvas/             # FlowCanvas, Topbar, NodePicker, nodes/, edges/
    dashboard/          # DashboardClient
    history/            # HistoryPanel
  lib/                  # engine, dag, gemini, transloadit, run-workflow, validators…
  store/                # Zustand workflow store
  trigger/              # Trigger.dev tasks: crop-image, gemini, execute-workflow
  types/                # shared flow types
prisma/schema.prisma
trigger.config.ts
```
