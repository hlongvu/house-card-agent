import { z } from "zod";

export const PriceEntrySchema = z.object({
  item: z.string(),
  unit: z.string(),
  low: z.number().nonnegative(),
  mid: z.number().nonnegative(),
  high: z.number().nonnegative(),
  currency: z.string().default("VND"),
  sourceUrl: z.string().optional(),
  sourceTitle: z.string().optional(),
  fetchedAt: z.string().optional(),
});

export const LaborEntrySchema = z.object({
  trade: z.string(),
  unit: z.string().default("man-day"),
  rateLow: z.number().nonnegative(),
  rateMid: z.number().nonnegative(),
  rateHigh: z.number().nonnegative(),
  currency: z.string().default("VND"),
  sourceUrl: z.string().optional(),
  sourceTitle: z.string().optional(),
});

export const MarketDataSchema = z.object({
  region: z.string(),
  prices: z.array(PriceEntrySchema),
  labor: z.array(LaborEntrySchema),
  citations: z
    .array(
      z.object({
        url: z.string(),
        title: z.string(),
        accessedAt: z.string().optional(),
      })
    )
    .default([]),
  notes: z.array(z.string()).default([]),
});

export type PriceEntry = z.infer<typeof PriceEntrySchema>;
export type LaborEntry = z.infer<typeof LaborEntrySchema>;
export type MarketData = z.infer<typeof MarketDataSchema>;
