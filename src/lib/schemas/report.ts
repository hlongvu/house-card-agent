import { z } from "zod";

export const CostLineItemSchema = z.object({
  category: z.string(),
  description: z.string(),
  qty: z.number().nonnegative(),
  unit: z.string(),
  unitCostLow: z.number().nonnegative(),
  unitCostMid: z.number().nonnegative(),
  unitCostHigh: z.number().nonnegative(),
  totalLow: z.number().nonnegative(),
  totalMid: z.number().nonnegative(),
  totalHigh: z.number().nonnegative(),
});

export const CostBreakdownSchema = z.object({
  currency: z.string().default("VND"),
  subtotalLow: z.number().nonnegative(),
  subtotalMid: z.number().nonnegative(),
  subtotalHigh: z.number().nonnegative(),
  contingencyPct: z.number().min(0).max(100).default(10),
  totalLow: z.number().nonnegative(),
  totalMid: z.number().nonnegative(),
  totalHigh: z.number().nonnegative(),
  lines: z.array(CostLineItemSchema),
});

export const TimelinePhaseSchema = z.object({
  name: z.string(),
  startDay: z.number().int().nonnegative(),
  durationDays: z.number().int().nonnegative(),
  endDay: z.number().int().nonnegative(),
  description: z.string().default(""),
  laborByTrade: z
    .array(
      z.object({
        trade: z.string(),
        manDays: z.number().nonnegative(),
      })
    )
    .default([]),
});

export const TimelineSchema = z.object({
  totalDays: z.number().int().nonnegative(),
  phases: z.array(TimelinePhaseSchema),
});

export const RiskSchema = z.object({
  level: z.enum(["low", "medium", "high"]),
  title: z.string(),
  description: z.string(),
});

export const ReportSchema = z.object({
  title: z.string(),
  region: z.string(),
  cost: CostBreakdownSchema,
  timeline: TimelineSchema,
  risks: z.array(RiskSchema),
  materials: z.array(
    z.object({
      category: z.string(),
      item: z.string(),
      qty: z.number().nonnegative(),
      unit: z.string(),
    })
  ),
  labor: z.array(
    z.object({
      trade: z.string(),
      manDays: z.number().nonnegative(),
    })
  ),
  citations: z.array(
    z.object({ url: z.string(), title: z.string() })
  ),
  markdown: z.string(),
  assumptions: z.array(z.string()),
  generatedAt: z.string(),
});

export type Report = z.infer<typeof ReportSchema>;
