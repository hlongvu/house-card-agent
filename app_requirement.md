# App Requirement: CAD Design Analyzer

## 1. Overview

A local Next.js web app that ingests a CAD design file (DWG, SKP, PDF, or image),
runs a multi-agent orchestration pipeline to analyze the design, research the
current construction market, and outputs a project report covering estimated
**cost**, **timeline**, **materials**, and **labor** required to build the real
house.

- **No authentication / no login** in v1.
- **Single-user local app** running on `localhost`.
- **Stack**: Next.js (App Router) + Prisma + PostgreSQL.

---

## 2. User Flow

1. User opens the app in a browser (`http://localhost:3000`).
2. User drags-and-drops (or picks) one CAD file from disk.
3. User clicks **Analyze**.
4. The app uploads the file, creates a `Project` record, and kicks off the
   agent pipeline in the background.
5. The UI polls (or uses SSE) to show live progress per agent step.
6. When the pipeline finishes, the user sees a structured report with:
   - Cost estimate (low / mid / high range, with line items)
   - Timeline estimate (phased Gantt-style breakdown)
   - Materials list with quantities
   - Labor estimate (man-days, trades required)
   - Source citations from the market research agent

---

## 3. Tech Stack

| Layer            | Choice                                    |
|------------------|-------------------------------------------|
| Frontend         | Next.js 14 (App Router) + React + Tailwind|
| Backend          | Next.js Route Handlers + Server Actions   |
| ORM              | Prisma                                    |
| Database         | PostgreSQL 16 (local Docker or installed) |
| File storage     | Local `./uploads/` directory (v1)         |
| Agent runtime    | Local orchestration module (Node.js)      |
| LLM provider     | Pluggable; default: OpenAI-compatible API via env var |
| Job processing   | In-process async worker (v1) — no Redis/queue yet |

---

## 4. Multi-Agent Orchestration

A central **Orchestrator** runs four specialized agents in sequence with
limited parallelism where independent. State is persisted in Postgres so the
pipeline can be inspected, resumed, and replayed.

### 4.1 Agents

| # | Agent              | Input                          | Output                                            |
|---|--------------------|--------------------------------|---------------------------------------------------|
| 1 | **Parser Agent**   | Raw CAD/PDF/image file         | Structured `DesignSpec`: rooms, dimensions, levels, roof type, openings, gross floor area |
| 2 | **Quantifier Agent** | `DesignSpec`                 | `BillOfQuantities`: materials + quantities by category (concrete, steel, brick, roofing, finishes, MEP) |
| 3 | **Market Research Agent** | `BillOfQuantities` + region (env-configured) | `MarketData`: current unit prices, supplier ranges, regional labor rates, with source URLs |
| 4 | **Estimator Agent** | `BillOfQuantities` + `MarketData` | Final `Report`: cost breakdown, timeline phases, risk notes, assumptions |

### 4.2 Orchestration Rules

- The **Orchestrator** persists each agent run as an `AgentRun` row
  (`status: pending | running | succeeded | failed`, `input`, `output`, `error`,
  `startedAt`, `finishedAt`).
- Agents communicate **only through DB rows** (no in-memory coupling), so the
  pipeline is observable and resumable.
- Steps 2 and 3 may run in parallel once step 1 finishes (quantities and
  market data are independent); step 4 always waits for both.
- Each agent has a **timeout** and **retry budget** (configurable via env).
- If any agent fails after retries, the project is marked `failed` with the
  failing agent's error surfaced in the UI.
- Each agent's **prompt template** and **tool list** is versioned in the DB
  (table `AgentDefinition`) so prompts can be iterated without code deploys.

### 4.3 Agent Implementation Notes (v1)

- **Parser Agent**: dispatch by MIME type.
  - PDF → text + page rendering via `pdf-parse` / `pdfjs`.
  - DWG/SKP → for v1, convert externally to PDF before upload (parser
    handles PDF); note this as a v1 limitation.
  - Image → vision model directly.
  - Output: a JSON `DesignSpec` validated by a Zod schema.
- **Quantifier Agent**: prompt + `DesignSpec` → LLM produces `BillOfQuantities`
  JSON. Optionally cross-check with simple rule-based formulas
  (e.g. concrete volume ≈ slab area × thickness).
- **Market Research Agent**: LLM with web-search tool (or Tavily/SerpAPI if a
  key is provided). Returns `MarketData` with citations.
- **Estimator Agent**: combines the two and applies contingency (default 10%)
  and a region multiplier (from env / a future settings page).

---

## 5. Data Model (Prisma)

```prisma
model Project {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  title       String
  region      String   @default("VN-HCM")  // for market research
  status      ProjectStatus @default(UPLOADED)
  inputFile   InputFile?
  designSpec  DesignSpec?
  boq         BillOfQuantities?
  marketData  MarketData?
  report      Report?
  agentRuns   AgentRun[]
}

enum ProjectStatus {
  UPLOADED
  PARSING
  QUANTIFYING
  RESEARCHING
  ESTIMATING
  COMPLETED
  FAILED
}

model InputFile {
  id         String  @id @default(cuid())
  projectId  String  @unique
  project    Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  filename   String
  mimeType   String
  sizeBytes  Int
  storagePath String  // local path under ./uploads
  sha256     String
}

model DesignSpec {
  id         String  @id @default(cuid())
  projectId  String  @unique
  project    Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  rawJson    Json    // full LLM output
  summary    String? // human-readable
  gfaM2      Float?  // gross floor area
  rooms      Int?
  levels     Int?
}

model BillOfQuantities {
  id        String  @id @default(cuid())
  projectId String  @unique
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  items     Json    // [{ category, item, qty, unit }, ...]
  totalItems Int
}

model MarketData {
  id        String  @id @default(cuid())
  projectId String  @unique
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  prices    Json    // { item: { unit, low, mid, high, currency, sourceUrl } }
  labor     Json
  fetchedAt DateTime @default(now())
}

model Report {
  id        String  @id @default(cuid())
  projectId String  @unique
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  costJson  Json
  timelineJson Json
  risks     Json
  markdown  String  // rendered report
  createdAt DateTime @default(now())
}

model AgentDefinition {
  id        String  @id @default(cuid())
  name      String  @unique
  version   Int
  prompt    String
  tools     Json
  isActive  Boolean @default(true)
  createdAt DateTime @default(now())

  runs      AgentRun[]
}

model AgentRun {
  id          String  @id @default(cuid())
  projectId   String
  project     Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  definitionId String
  definition  AgentDefinition @relation(fields: [definitionId], references: [id])
  agentName   String           // denormalized for easy querying
  status      AgentRunStatus   @default(PENDING)
  input       Json
  output      Json?
  error       String?
  attempts    Int              @default(0)
  startedAt   DateTime?
  finishedAt  DateTime?
  createdAt   DateTime         @default(now())

  @@index([projectId, agentName])
}

enum AgentRunStatus {
  PENDING
  RUNNING
  SUCCEEDED
  FAILED
}
```

---

## 6. API Surface (Route Handlers)

| Method | Path                          | Purpose                                    |
|--------|-------------------------------|--------------------------------------------|
| POST   | `/api/projects`               | Multipart upload; creates `Project` + `InputFile`, enqueues parse |
| GET    | `/api/projects`               | List all projects                          |
| GET    | `/api/projects/:id`           | Get project + latest status + agent runs   |
| GET    | `/api/projects/:id/report`    | Get final report (404 if not completed)    |
| POST   | `/api/projects/:id/retry`     | Resume pipeline from the last failed agent |
| GET    | `/api/projects/:id/events`    | SSE stream of agent-run status changes     |

---

## 7. UI Pages

| Route                  | Purpose                                              |
|------------------------|------------------------------------------------------|
| `/`                    | Upload dropzone + list of past projects              |
| `/projects/[id]`       | Live status of the 4 agents + partial outputs        |
| `/projects/[id]/report`| Final report: cost table, timeline, materials, labor, citations |

Layout uses Tailwind, no auth wall, single dark/light theme.

---

## 8. Project Structure

```
app_requirement.md
package.json
next.config.js
tailwind.config.ts
tsconfig.json
.env.example
prisma/
  schema.prisma
  seed.ts
src/
  app/
    layout.tsx
    page.tsx                      // home + upload
    projects/[id]/page.tsx        // live status
    projects/[id]/report/page.tsx // final report
    api/
      projects/route.ts
      projects/[id]/route.ts
      projects/[id]/report/route.ts
      projects/[id]/retry/route.ts
      projects/[id]/events/route.ts
  components/
    UploadDropzone.tsx
    AgentStatusList.tsx
    CostTable.tsx
    TimelineView.tsx
  lib/
    db.ts                         // prisma client singleton
    orchestrator/
      index.ts                    // runPipeline(projectId)
      parserAgent.ts
      quantifierAgent.ts
      marketResearchAgent.ts
      estimatorAgent.ts
    llm/
      client.ts                   // OpenAI-compatible client
      tools/
        webSearch.ts
    schemas/
      designSpec.ts               // Zod
      boq.ts
      marketData.ts
      report.ts
  uploads/                        // gitignored, runtime files
```

---

## 9. Environment Variables (`.env.example`)

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cad_design"
OPENAI_API_KEY=""
OPENAI_BASE_URL=""                 # optional, for compatible providers
OPENAI_MODEL="gpt-4o-mini"
WEB_SEARCH_PROVIDER=""             # "tavily" | "serpapi" | ""
WEB_SEARCH_API_KEY=""
DEFAULT_REGION="VN-HCM"
AGENT_TIMEOUT_MS="120000"
AGENT_MAX_RETRIES="2"
UPLOAD_DIR="./uploads"
MAX_UPLOAD_MB="25"
```

---

## 10. Local Run Steps

1. `docker run -d --name cad-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16`
   *(or use a local install).*
2. `cp .env.example .env` and fill in keys.
3. `npm install`
4. `npx prisma migrate dev --name init`
5. `npx prisma db seed`  *(seeds default `AgentDefinition` rows).*
6. `npm run dev` → open `http://localhost:3000`.

---

## 11. v1 Limitations / Out of Scope

- No auth, no multi-user separation.
- DWG/SKP are not parsed directly; user must convert to PDF first.
- No persistent job queue; long jobs run in the same Node process (fine for
  local single-user use).
- Market research quality depends on the LLM's web tool; no manual override UI.
- No export to PDF/Excel in v1 (report is viewable on screen and available as
  JSON via the API).

---

## 12. Stretch Goals (post-v1)

- True DWG parsing via a library or external service.
- BullMQ + Redis for robust background jobs.
- User accounts + project sharing.
- Region picker in the UI and per-region price tables.
- Export report as PDF / Excel.
- Versioned, A/B-tested agent prompts surfaced in a small admin page.
