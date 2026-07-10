# House Card Agent

A multi-agent AI system that turns CAD drawings, PDFs, and floorplan images into construction cost estimates for the Vietnamese market.

Upload a `.dwg`, `.dxf`, `.pdf`, or image of a building plan. A pipeline of five specialized agents reads the design, generates a bill of quantities, researches current market prices, drafts a construction schedule, and produces a final cost report — all in VND.

[Video walkthrough](https://github.com/user-attachments/assets/PLACEHOLDER)

<video src="https://github.com/hlongvu/house-card-agent/raw/main/FILE/house_card_design.mp4" controls></video>

## How It Works

```
                  ┌─────────────┐
   .dwg/.dxf/.pdf │             │  DesignSpec
   /image ──────► │   Parser    ├──────────────┐
                  │   Agent     │              │
                  └─────────────┘              ▼
                                        ┌─────────────┐
                                        │ Quantifier  │  BillOfQuantities
                                        │   Agent     ├──────────┐
                                        └─────────────┘          │
                                                                 ▼
                                  ┌─────────────┐     ┌─────────────┐
                                  │   Market    │     │  Scheduler  │  MarketData
                                  │  Research   │     │    Agent    │  Schedule
                                  │   Agent     │     └─────────────┘
                                  └──────┬──────┘
                                         │
                                         ▼
                                  ┌─────────────┐
                                  │  Estimator  │  Report
                                  │   Agent     │  (cost + timeline +
                                  └─────────────┘   citations)
```

The five agents run in four stages:

1. **Parser** — Reads the input file. `.dwg` is converted to DXF via LibreDWG WASM, `.dxf` is parsed for entities and text labels, `.pdf` is text-extracted, images go through a vision model. Outputs a `DesignSpec` (rooms, levels, GFA, roof, walls, MEP).
2. **Quantifier** — Converts the design into a bill of quantities (structural, masonry, roofing, finishes, doors/windows, MEP rough-in, paint, waterproofing).
3. **Market Research + Scheduler** (parallel) — Market research searches the web (SerpAPI/Tavily) for current VND unit prices and labor rates by trade. Scheduler drafts 10–16 phases from site prep to handover, with dependencies, critical path, and risk factors.
4. **Estimator** — Combines everything into the final report: cost breakdown (low/mid/high + 10% contingency), timeline, risks, materials, labor, citations, and a markdown summary.

## Stack

- **Framework**: Next.js 16 (App Router) with React 19
- **Database**: PostgreSQL via Prisma 7
- **LLM**: OpenAI (`gpt-4o-mini` default) or DeepSeek — switched by `LLM_PROVIDER`
- **Web Search**: SerpAPI or Tavily (optional; without it, prices are model estimates)
- **CAD**: `@mlightcad/libredwg-web` (DWG→DXF), `dxf-parser`, `pdf-parse`
- **Validation**: Zod
- **Tests**: Vitest

## Project Structure

```
src/
  app/                          Next.js routes
    page.tsx                    Home (upload + project list)
    projects/[id]/              Project detail + live status
    projects/[id]/report/       Final report
    api/projects/               REST endpoints (upload, status, retry, SSE)
  components/                   UploadDropzone, AgentStatusList, CostTable, TimelineView
  lib/
    agents/                     Agent framework (chain, parallel, hooks, guardrails, tracing)
    llm/                        OpenAI client + web search tool
    orchestrator/               v2 pipeline (active) + v1 (legacy)
    schemas/                    Zod schemas (DesignSpec, BOQ, Schedule, MarketData, Report)
prisma/
  schema.prisma                 Data models
  migrations/                   Initial migration
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
docker run -d --name cad-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 4. Run database migrations and seed

```bash
npx prisma migrate dev
npx prisma db seed
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `LLM_PROVIDER` | Yes | `openai` or `deepseek` |
| `OPENAI_API_KEY` | If using OpenAI | OpenAI API key |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` |
| `DEEPSEEK_API_KEY` | If using DeepSeek | DeepSeek API key |
| `DEEPSEEK_MODEL` | No | Defaults to `deepseek-chat` |
| `WEB_SEARCH_PROVIDER` | No | `serpapi` or `tavily` — enables real market price lookup |
| `WEB_SEARCH_API_KEY` | If using web search | API key for chosen provider |
| `DEFAULT_REGION` | No | Defaults to `VN-HCM` |
| `AGENT_TIMEOUT_MS` | No | Per-agent timeout, defaults to 120000 (2 min) |
| `AGENT_MAX_RETRIES` | No | Retries per agent, defaults to 2 |
| `UPLOAD_DIR` | No | Where uploaded files are stored, defaults to `./uploads` |
| `MAX_UPLOAD_MB` | No | Max upload size, defaults to 25 |

## Supported File Formats

| Format | How it's processed |
|--------|-------------------|
| `.dwg` | Converted to DXF via LibreDWG WASM, then parsed for entities and text |
| `.dxf` | Parsed directly (entities, layers, text annotations) |
| `.pdf` | Text extraction via `pdf-parse` |
| `.jpg`, `.png`, etc. | Sent to a vision-capable LLM (OpenAI only — DeepSeek doesn't support images) |
| `.skp` | Not supported — must be exported to DWG or PDF first |

## Pipeline Behavior

- **Auto-retry**: If a project ends in `FAILED` state, refreshing the project detail page automatically restarts the pipeline (`AutoRetryFailed` component + `POST /api/projects/[id]/retry`).
- **Live updates**: The project page subscribes to an SSE stream (`GET /api/projects/[id]/events`) for real-time status.
- **Partial recovery**: Retries restart the full pipeline from the parser stage. The pipeline re-runs all agents and overwrites previous outputs.

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Run production build
npm run lint         # ESLint
npm run test         # Vitest (unit + integration + schema tests)
npm run test:watch   # Vitest watch mode
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/projects` | Upload a file, create a project, start the pipeline |
| `GET` | `/api/projects` | List recent projects |
| `GET` | `/api/projects/[id]` | Project details with all outputs |
| `GET` | `/api/projects/[id]/events` | SSE stream of status changes |
| `GET` | `/api/projects/[id]/report` | Final report JSON |
| `POST` | `/api/projects/[id]/retry` | Restart pipeline (only valid for `FAILED` projects) |

## Limitations

- No authentication — single-user assumption.
- Pipeline runs in-process. Long jobs block the Next.js server's memory; for production use, move to a job queue.
- The market research and estimator agents require the LLM to follow JSON schemas strictly. OpenAI's strict mode is used; schemas are auto-patched to list all properties as required.
- Web search citations are only as reliable as the configured search provider. Without it, prices are model estimates and citations are unreliable.
