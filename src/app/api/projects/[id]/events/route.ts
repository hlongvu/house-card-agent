import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/projects/[id]/events">
) {
  const { id } = await ctx.params;

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const lastStatuses = new Map<string, string>();

      const sendEvent = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const poll = async () => {
        if (closed) return;

        try {
          const runs = await db.agentRun.findMany({
            where: { projectId: id },
            orderBy: { createdAt: "asc" },
          });

          for (const run of runs) {
            const prevStatus = lastStatuses.get(run.id);
            if (prevStatus !== run.status) {
              lastStatuses.set(run.id, run.status);
              sendEvent({
                type: "agent-run",
                id: run.id,
                agentName: run.agentName,
                status: run.status,
                error: run.error,
                startedAt: run.startedAt,
                finishedAt: run.finishedAt,
                attempts: run.attempts,
              });
            }
          }

          const project = await db.project.findUnique({
            where: { id },
            select: { status: true },
          });

          sendEvent({
            type: "project-status",
            status: project?.status,
          });

          if (
            project?.status === "COMPLETED" ||
            project?.status === "FAILED"
          ) {
            controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
            controller.close();
            return;
          }
        } catch (err) {
          if (!closed) {
            sendEvent({ type: "error", error: String(err) });
          }
          controller.close();
          return;
        }

        await new Promise<void>((resolve) => setTimeout(resolve, 2000));
        poll();
      };

      poll();
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
