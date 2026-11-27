export interface DatabaseTables {
  links: {
    id: string;
    slug: string;
    target_url: string;
    webhook_url: string | null;
    clicks: number;
    created_at: string;
  };
}
