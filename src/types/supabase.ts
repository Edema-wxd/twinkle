// This file will be replaced by running:
//   npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" --schema public > src/types/supabase.ts
// Do not edit manually once generated.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Helper type for extracting row types (will work once tables are added)
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
