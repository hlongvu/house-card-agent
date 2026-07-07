import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/projects/[id]/report">
) {
  const { id } = await ctx.params;

  const report = await db.report.findUnique({
    where: { projectId: id },
    include: {
      project: {
        select: { status: true },
      },
    },
  });

  if (!report) {
    return NextResponse.json(
      { error: "Report not available yet" },
      { status: 404 }
    );
  }

  return NextResponse.json(report);
}
