import { z } from "zod";

export const healthSchema = z.object({
  ok: z.boolean(),
});

export type HealthResponse = z.infer<typeof healthSchema>;
