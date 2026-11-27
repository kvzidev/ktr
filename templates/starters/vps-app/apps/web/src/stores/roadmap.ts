import { atom } from "nanostores";

export const $selectedStatus = atom<"all" | "planned" | "in_progress" | "shipped">(
  "all",
);
