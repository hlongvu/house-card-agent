import { z } from "zod";

export const SchedulePhaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  startDay: z.number().int().nonnegative(),
  durationDays: z.number().int().nonnegative(),
  endDay: z.number().int().nonnegative(),
  dependsOn: z.array(z.string()).default([]),
  laborByTrade: z
    .array(
      z.object({
        trade: z.string(),
        workers: z.number().int().nonnegative(),
        manDays: z.number().nonnegative(),
      })
    )
    .default([]),
  keyMaterials: z.array(z.string()).default([]),
  description: z.string().default(""),
  weatherSensitive: z.boolean().default(false),
});

export const ConstructionScheduleSchema = z.object({
  totalDurationDays: z.number().int().nonnegative(),
  phases: z.array(SchedulePhaseSchema),
  criticalPath: z.array(z.string()).default([]),
  riskFactors: z
    .array(
      z.object({
        level: z.enum(["low", "medium", "high"]),
        title: z.string(),
        description: z.string(),
      })
    )
    .default([]),
  notes: z.array(z.string()).default([]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type SchedulePhase = z.infer<typeof SchedulePhaseSchema>;
export type ConstructionSchedule = z.infer<typeof ConstructionScheduleSchema>;
