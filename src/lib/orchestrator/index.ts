import { db } from "@/lib/db";
import { runParserAgent } from "./parserAgent";
import { runQuantifierAgent } from "./quantifierAgent";
import { runMarketResearchAgent } from "./marketResearchAgent";
import { runScheduleAgent } from "./scheduleAgent";
import { runEstimatorAgent } from "./estimatorAgent";
import type { PrismaClient } from "@prisma/client";

const AGENT_TIMEOUT_MS = parseInt(process.env.AGENT_TIMEOUT_MS || "120000", 10);
const AGENT_MAX_RETRIES = parseInt(process.env.AGENT_MAX_RETRIES || "2", 10);

export async function runPipeline(projectId: string) {
  try {
    await updateProjectStatus(projectId, "PARSING");
    await runAgentStep(projectId, "parser", runParserAgent);

    await updateProjectStatus(projectId, "QUANTIFYING");
    const quantifierP = runAgentStep(projectId, "quantifier", runQuantifierAgent);

    await updateProjectStatus(projectId, "RESEARCHING");
    const researcherP = runAgentStep(projectId, "market-research", runMarketResearchAgent);

    await Promise.all([quantifierP, researcherP]);

    await updateProjectStatus(projectId, "SCHEDULING");
    await runAgentStep(projectId, "scheduler", runScheduleAgent);

    await updateProjectStatus(projectId, "ESTIMATING");
    await runAgentStep(projectId, "estimator", runEstimatorAgent);

    await db.project.update({
      where: { id: projectId },
      data: { status: "COMPLETED" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Pipeline failed for project ${projectId}:`, message);
    await db.project.update({
      where: { id: projectId },
      data: { status: "FAILED" },
    });
    throw err;
  }
}

async function updateProjectStatus(projectId: string, status: string) {
  const statusEnum = status as
    | "PARSING"
    | "QUANTIFYING"
    | "RESEARCHING"
    | "SCHEDULING"
    | "ESTIMATING";
  await db.project.update({
    where: { id: projectId },
    data: { status: statusEnum },
  });
}

type AgentFn = (runId: string, dbInstance: PrismaClient) => Promise<void>;

async function runAgentStep(
  projectId: string,
  agentName: string,
  fn: AgentFn
) {
  const definition = await db.agentDefinition.findFirst({
    where: { name: agentName, isActive: true },
    orderBy: { version: "desc" },
  });

  if (!definition) {
    throw new Error(`No active AgentDefinition found for ${agentName}`);
  }

  const input = { projectId, region: process.env.DEFAULT_REGION || "VN-HCM" };

  const run = await db.agentRun.create({
    data: {
      projectId,
      definitionId: definition.id,
      agentName,
      status: "RUNNING",
      input,
      attempts: 1,
      startedAt: new Date(),
    },
  });

  let lastError: unknown;

  for (let attempt = 1; attempt <= AGENT_MAX_RETRIES + 1; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), AGENT_TIMEOUT_MS);

    try {
      await fn(run.id, db);

      clearTimeout(timer);

      await db.agentRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCEEDED",
          attempts: attempt,
          finishedAt: new Date(),
        },
      });
      return;
    } catch (err: unknown) {
      clearTimeout(timer);
      lastError = err;

      const isTimeout = err instanceof Error && err.name === "AbortError";
      console.error(
        `Agent ${agentName} attempt ${attempt} failed:`,
        isTimeout ? "timeout" : err
      );

      if (attempt <= AGENT_MAX_RETRIES) {
        await db.agentRun.update({
          where: { id: run.id },
          data: { attempts: attempt + 1 },
        });
      }
    }
  }

  const finalError =
    lastError instanceof Error ? lastError.message : String(lastError);

  await db.agentRun.update({
    where: { id: run.id },
    data: {
      status: "FAILED",
      error: finalError,
      finishedAt: new Date(),
    },
  });
  throw new Error(`Agent ${agentName} failed: ${finalError}`);
}
