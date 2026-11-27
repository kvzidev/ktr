import { z } from "zod";

export const IssuePrioritySchema = z.enum(["low", "medium", "high"]);
export const IssueStatusSchema = z.enum(["todo", "in_progress", "done"]);

export const CreateIssueSchema = z.object({
  title: z.string().min(3).max(140),
  priority: IssuePrioritySchema.default("medium"),
});

export const IssueDtoSchema = CreateIssueSchema.extend({
  id: z.string(),
  status: IssueStatusSchema,
  createdAt: z.string(),
});

export type IssuePriority = z.infer<typeof IssuePrioritySchema>;
export type IssueStatus = z.infer<typeof IssueStatusSchema>;
export type CreateIssueInput = z.infer<typeof CreateIssueSchema>;
export type IssueDto = z.infer<typeof IssueDtoSchema>;
