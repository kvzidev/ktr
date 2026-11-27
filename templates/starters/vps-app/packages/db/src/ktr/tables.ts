export interface DatabaseTables {
  roadmap_items: {
    id: string;
    title: string;
    description: string;
    status: "planned" | "in_progress" | "shipped";
    votes: number;
    created_at: string;
  };
}
