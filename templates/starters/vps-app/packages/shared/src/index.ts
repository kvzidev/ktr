import { z } from "zod";

export const RoadmapStatusSchema = z.enum([
  "planned",
  "in_progress",
  "shipped",
]);

export const CreateRoadmapItemSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
});

export const RoadmapItemSchema = CreateRoadmapItemSchema.extend({
  id: z.string(),
  status: RoadmapStatusSchema,
  votes: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export type RoadmapStatus = z.infer<typeof RoadmapStatusSchema>;
export type CreateRoadmapItemInput = z.infer<typeof CreateRoadmapItemSchema>;
export type RoadmapItem = z.infer<typeof RoadmapItemSchema>;
