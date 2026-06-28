// ponytail: stub — Task 4 replaces this with `supabase gen types`. Keeps clients type-checked meanwhile.
// ponytail: users row shape added so ensureUser upsert typechecks; Task 4 overwrites with generated types.
export type Database = {
  public: {
    Tables: {
      users: {
        Row: { id: string; default_locale: string; plan: string; created_at: string };
        Insert: { id: string; default_locale?: string; plan?: string; created_at?: string };
        Update: { id?: string; default_locale?: string; plan?: string; created_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
