import { z } from "zod";

export const BoqItemSchema = z.object({
  category: z.string(),
  item: z.string(),
  qty: z.number().nonnegative(),
  unit: z.string(),
  notes: z.string().optional(),
});

export const BillOfQuantitiesSchema = z.object({
  currency: z.string().default("VND"),
  items: z.array(BoqItemSchema),
  assumptions: z.array(z.string()).default([]),
});

export type BoqItem = z.infer<typeof BoqItemSchema>;
export type BillOfQuantities = z.infer<typeof BillOfQuantitiesSchema>;
