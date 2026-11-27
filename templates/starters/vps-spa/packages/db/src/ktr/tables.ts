export interface DatabaseTables {
  issues: {
    id: string;
    title: string;
    priority: "low" | "medium" | "high";
    status: "todo" | "in_progress" | "done";
    created_at: string;
  };
}
