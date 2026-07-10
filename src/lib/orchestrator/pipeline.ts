import { db } from "@/lib/db";
import { parserAgent, type ParserInput } from "./v2/parserAgent";
import { quantifierAgent } from "./v2/quantifierAgent";
import { marketResearchAgent } from "./v2/marketResearchAgent";
import { schedulerAgent } from "./v2/schedulerAgent";
import { estimatorAgent } from "./v2/estimatorAgent";
import { RunContext, tracer, type Trace } from "@/lib/agents";
import path from "node:path";
import fs from "node:fs";

const AGENT_TIMEOUT_MS = parseInt(process.env.AGENT_TIMEOUT_MS || "120000", 10);
const AGENT_MAX_RETRIES = parseInt(process.env.AGENT_MAX_RETRIES || "2", 10);

type ProjectState = {
  projectId: string;
  designSpec?: any;
  boq?: any;
  marketData?: any;
  schedule?: any;
  report?: any;
};

export async function runPipeline(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { inputFile: true },
  });

  if (!project) throw new Error(`Project ${projectId} not found`);
  if (!project.inputFile) throw new Error("No input file uploaded");

  const trace = tracer.startTrace(`pipeline-${projectId}`);
  const ctx = new RunContext<ProjectState>({ projectId }, trace.traceId);

  const inputFile = project.inputFile;
  const filePath = path.resolve(inputFile.storagePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  try {
    // ── Stage 1: PARSING ──
    await updateStatus(projectId, "PARSING");
    const parserInput: ParserInput = {
      projectId,
      filePath,
      filename: inputFile.filename,
      mimeType: inputFile.mimeType,
      region: project.region,
    };
    const designSpec = await parserAgent.run(parserInput, ctx, {
      maxRetries: AGENT_MAX_RETRIES,
      timeoutMs: AGENT_TIMEOUT_MS,
    });
    ctx.context.designSpec = designSpec;
    await persistDesignSpec(projectId, designSpec);

    // ── Stage 2: QUANTIFYING ──
    await updateStatus(projectId, "QUANTIFYING");
    const boqResult = await quantifierAgent.run(designSpec, ctx, {
      maxRetries: AGENT_MAX_RETRIES,
      timeoutMs: AGENT_TIMEOUT_MS,
    });
    ctx.context.boq = boqResult;
    await persistBoq(projectId, boqResult);

    // ── Stage 3: RESEARCHING + SCHEDULING in parallel ──
    await updateStatus(projectId, "RESEARCHING");
    const [marketData, schedule] = await Promise.all([
      marketResearchAgent.run(
        { boq: boqResult, region: project.region },
        ctx,
        { maxRetries: AGENT_MAX_RETRIES, timeoutMs: AGENT_TIMEOUT_MS }
      ),
      schedulerAgent.run(
        { designSpec, boq: boqResult, region: project.region },
        ctx,
        { maxRetries: AGENT_MAX_RETRIES, timeoutMs: AGENT_TIMEOUT_MS }
      ),
    ]);

    ctx.context.marketData = marketData;
    ctx.context.schedule = schedule;
    await persistMarketData(projectId, marketData);
    await persistSchedule(projectId, schedule);

    // ── Stage 4: ESTIMATING (final report) ──
    await updateStatus(projectId, "ESTIMATING");
    const report = await estimatorAgent.run(
      { designSpec, boq: boqResult, marketData, region: project.region },
      ctx,
      { maxRetries: AGENT_MAX_RETRIES, timeoutMs: AGENT_TIMEOUT_MS }
    );
    ctx.context.report = report;
    await persistReport(projectId, report);

    await db.project.update({
      where: { id: projectId },
      data: { status: "COMPLETED" },
    });

    tracer.endTrace(trace, "completed");
    console.log(
      `Pipeline ${trace.traceId} completed in ${
        Date.now() - trace.startedAt.getTime()
      }ms`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Pipeline ${trace.traceId} failed:`, message);
    await db.project.update({
      where: { id: projectId },
      data: { status: "FAILED" },
    });
    tracer.endTrace(trace, "failed");
    throw err;
  }
}

async function updateStatus(projectId: string, status: string) {
  const s = status as "PARSING" | "QUANTIFYING" | "RESEARCHING" | "SCHEDULING" | "ESTIMATING";
  await db.project.update({ where: { id: projectId }, data: { status: s } });
}

async function persistDesignSpec(projectId: string, designSpec: any) {
  await db.designSpec.create({
    data: {
      projectId,
      rawJson: designSpec,
      summary: designSpec.summary,
      gfaM2: designSpec.gfaM2,
      rooms: designSpec.rooms,
      levels: designSpec.levels,
    },
  });
}

async function persistBoq(projectId: string, boq: any) {
  await db.billOfQuantities.create({
    data: {
      projectId,
      items: boq.items as any,
      totalItems: boq.items.length,
    },
  });
}

async function persistMarketData(projectId: string, marketData: any) {
  await db.marketData.create({
    data: {
      projectId,
      prices: marketData.prices as any,
      labor: marketData.labor as any,
    },
  });
}

async function persistSchedule(projectId: string, schedule: any) {
  await db.schedule.create({
    data: {
      projectId,
      phases: schedule.phases as any,
      totalDurationDays: schedule.totalDurationDays,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      criticalPath: schedule.criticalPath as any,
      riskFactors: schedule.riskFactors as any,
      notes: schedule.notes as any,
    },
  });
}

async function persistReport(projectId: string, report: any) {
  await db.report.create({
    data: {
      projectId,
      costJson: report.cost as any,
      timelineJson: report.timeline as any,
      risks: report.risks as any,
      markdown: report.markdown,
      materials: report.materials as any,
      labor: report.labor as any,
      citations: report.citations as any,
      assumptions: report.assumptions as any,
    },
  });
}
