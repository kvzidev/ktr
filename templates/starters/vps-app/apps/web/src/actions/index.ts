import { CreateRoadmapItemSchema } from "@repo/shared";

export const server = {
  createItem: async (input: unknown) => {
    const parsed = CreateRoadmapItemSchema.parse(input);
    return { ok: true, item: parsed };
  },
};
