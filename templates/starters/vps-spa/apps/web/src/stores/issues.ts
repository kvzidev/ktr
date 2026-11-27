import { atom } from "nanostores";

export const $priorityFilter = atom<"all" | "low" | "medium" | "high">("all");
