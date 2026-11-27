import { z } from "zod";

export const CreateLinkSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/),
  targetUrl: z.string().url(),
  webhookUrl: z.string().url().optional(),
});

export const LinkDtoSchema = CreateLinkSchema.extend({
  id: z.string(),
  clicks: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export const WebhookDeliveryJobSchema = z.object({
  linkId: z.string(),
  webhookUrl: z.string().url(),
  event: z.enum(["link.clicked", "link.created"]),
  occurredAt: z.string(),
});

export type CreateLinkInput = z.infer<typeof CreateLinkSchema>;
export type LinkDto = z.infer<typeof LinkDtoSchema>;
export type WebhookDeliveryJob = z.infer<typeof WebhookDeliveryJobSchema>;
