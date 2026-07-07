import { z } from "zod";

export const RoomSchema = z.object({
  name: z.string(),
  areaM2: z.number().nonnegative().optional(),
  level: z.number().int().optional(),
});

export const DesignSpecSchema = z.object({
  projectType: z.string().default("residential house"),
  levels: z.number().int().nonnegative().default(1),
  rooms: z.number().int().nonnegative().default(0),
  roomList: z.array(RoomSchema).default([]),
  gfaM2: z.number().nonnegative().default(0),
  roofType: z.string().default("unknown"),
  foundationType: z.string().default("unknown"),
  structuralSystem: z.string().default("unknown"),
  exteriorWalls: z.string().default("unknown"),
  openings: z
    .object({
      doors: z.number().int().nonnegative().default(0),
      windows: z.number().int().nonnegative().default(0),
    })
    .default({ doors: 0, windows: 0 }),
  finishes: z
    .object({
      flooring: z.string().default("unknown"),
      wallFinish: z.string().default("unknown"),
      ceiling: z.string().default("unknown"),
    })
    .default({ flooring: "unknown", wallFinish: "unknown", ceiling: "unknown" }),
  mep: z
    .object({
      electrical: z.boolean().default(true),
      plumbing: z.boolean().default(true),
      hvac: z.boolean().default(false),
    })
    .default({ electrical: true, plumbing: true, hvac: false }),
  summary: z.string().default(""),
  notes: z.array(z.string()).default([]),
});

export type DesignSpec = z.infer<typeof DesignSpecSchema>;
