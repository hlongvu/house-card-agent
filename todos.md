# MVP Status — CAD Design Analyzer

## Done (all files exist and build passes)

- [x] Next.js 16 (App Router) scaffold with Tailwind v4
- [x] Prisma 7 schema with PostgreSQL adapter (`@prisma/adapter-pg`)
- [x] `prisma.config.ts` + `prisma/seed.ts` seeding 4 AgentDefinitions
- [x] `src/lib/db.ts` — Prisma client singleton with `PrismaPg` adapter
- [x] `src/lib/schemas/` — Zod schemas for DesignSpec, Boq, MarketData, Report
- [x] `src/lib/llm/client.ts` — OpenAI-compatible client with vision + structured output
- [x] `src/lib/llm/tools/webSearch.ts` — Tavily / SerpAPI web search
- [x] `src/lib/orchestrator/index.ts` — pipeline (parser → quantifier‖marketResearch → estimator) with retry + timeout
- [x] `src/lib/orchestrator/parserAgent.ts` — PDF + image parsing
- [x] `src/lib/orchestrator/quantifierAgent.ts` — generates BOQ
- [x] `src/lib/orchestrator/marketResearchAgent.ts` — prices + labor rates + web search
- [x] `src/lib/orchestrator/estimatorAgent.ts` — final report with cost/timeline/risks/materials/labor/citations
- [x] API routes: `POST/GET /api/projects`, `GET /api/projects/[id]`, `GET /api/projects/[id]/report`, `POST /api/projects/[id]/retry`, `GET /api/projects/[id]/events` (SSE)
- [x] UI pages: `/` (upload + project list), `/projects/[id]` (status), `/projects/[id]/report` (final report)
- [x] 4 components: `UploadDropzone`, `AgentStatusList`, `CostTable`, `TimelineView`
- [x] `.env.example` with all required env vars
- [x] `.gitignore` covering Next + Prisma + uploads
- [x] `npm run build` passes (TypeScript + Turbopack)

## Remaining MVP must-dos

- [ ] **Start PostgreSQL** — Run `docker run -d --name cad-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16`
- [ ] **Run migrations** — `npx prisma migrate dev --name init`
- [ ] **Run seed** — `npx prisma db seed` (requires `tsx` installed)
- [ ] **Add OPENAI_API_KEY to .env** — LLM calls will 401 otherwise
- [ ] **Verify end-to-end** — Upload a sample file and check pipeline runs

## Known v1 limitations (as-documented in app_requirement.md §11)

- No authentication / login
- DWG/SKP require prior conversion to PDF
- No persistent job queue (in-process async)
- Market research degraded without `WEB_SEARCH_PROVIDER` + `WEB_SEARCH_API_KEY` set
- No PDF/Excel export
- Retry always restarts from parser (doesn't resume from last failed agent)
- `upload/` directory is not pre-created (created on first upload)

## Nice to have (not critical for MVP)

- [x] Install `tsx` for `npx prisma db seed`
- [x] Pre-create `uploads/` directory with `.gitkeep`
- [ ] `loading.tsx` suspense boundaries for project and report pages
- [ ] `docker-compose.yml` for one-command Postgres launch
- [ ] SSE reconnection handling on the client side
- [ ] File hash deduplication (prevent re-uploading same file)
