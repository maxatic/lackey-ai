// Hand-authored from supabase/migrations/0001_schema.sql (9 tables + entry_kind enum).
// Shape matches `supabase gen types typescript`: per-table Row/Insert/Update where a
// column that is nullable OR has a DB default is optional on Insert. Regenerate with the
// Supabase CLI (`supabase gen types typescript --db-url "$DATABASE_URL"`) once it's wired;
// until then this is the single typed source consumed by src/lib/db/* and the clients.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: { id: string; default_locale: string; plan: string; created_at: string };
        Insert: { id: string; default_locale?: string; plan?: string; created_at?: string };
        Update: { id?: string; default_locale?: string; plan?: string; created_at?: string };
        Relationships: [];
      };
      personal_profile: {
        Row: {
          user_id: string;
          full_name: string | null;
          headline: string | null;
          email: string | null;
          phone: string | null;
          location: string | null;
          links: Json;
          photo_url: string | null;
          date_of_birth: string | null;
          nationality: string | null;
          marital_status: string | null;
          gender: string | null;
          driving_license: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          full_name?: string | null;
          headline?: string | null;
          email?: string | null;
          phone?: string | null;
          location?: string | null;
          links?: Json;
          photo_url?: string | null;
          date_of_birth?: string | null;
          nationality?: string | null;
          marital_status?: string | null;
          gender?: string | null;
          driving_license?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          full_name?: string | null;
          headline?: string | null;
          email?: string | null;
          phone?: string | null;
          location?: string | null;
          links?: Json;
          photo_url?: string | null;
          date_of_birth?: string | null;
          nationality?: string | null;
          marital_status?: string | null;
          gender?: string | null;
          driving_license?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      entries: {
        Row: {
          id: string;
          user_id: string;
          kind: Database['public']['Enums']['entry_kind'];
          title: string;
          organization: string | null;
          location: string | null;
          start_date: string | null;
          end_date: string | null;
          is_current: boolean;
          summary: string | null;
          details: Json;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: Database['public']['Enums']['entry_kind'];
          title: string;
          organization?: string | null;
          location?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          is_current?: boolean;
          summary?: string | null;
          details?: Json;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          kind?: Database['public']['Enums']['entry_kind'];
          title?: string;
          organization?: string | null;
          location?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          is_current?: boolean;
          summary?: string | null;
          details?: Json;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bullets: {
        Row: {
          id: string;
          user_id: string;
          entry_id: string;
          text: string;
          tags: string[];
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entry_id: string;
          text: string;
          tags?: string[];
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          entry_id?: string;
          text?: string;
          tags?: string[];
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      skills: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: string | null;
          proficiency: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          category?: string | null;
          proficiency?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          category?: string | null;
          proficiency?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      languages: {
        Row: { id: string; user_id: string; name: string; cefr_level: string };
        Insert: { id?: string; user_id: string; name: string; cefr_level: string };
        Update: { id?: string; user_id?: string; name?: string; cefr_level?: string };
        Relationships: [];
      };
      career_tracks: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          target_title: string | null;
          summary: string | null;
          default_locale: string | null;
          default_template: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          target_title?: string | null;
          summary?: string | null;
          default_locale?: string | null;
          default_template?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          target_title?: string | null;
          summary?: string | null;
          default_locale?: string | null;
          default_template?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      track_entries: {
        Row: { id: string; user_id: string; track_id: string; entry_id: string; sort_order: number };
        Insert: { id?: string; user_id: string; track_id: string; entry_id: string; sort_order?: number };
        Update: { id?: string; user_id?: string; track_id?: string; entry_id?: string; sort_order?: number };
        Relationships: [];
      };
      track_skills: {
        Row: { id: string; user_id: string; track_id: string; skill_id: string; sort_order: number };
        Insert: { id?: string; user_id: string; track_id: string; skill_id: string; sort_order?: number };
        Update: { id?: string; user_id?: string; track_id?: string; skill_id?: string; sort_order?: number };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      entry_kind:
        | 'experience'
        | 'education'
        | 'project'
        | 'certification'
        | 'award'
        | 'publication'
        | 'volunteering';
    };
    CompositeTypes: Record<string, never>;
  };
};
