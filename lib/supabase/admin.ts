import { createClient } from "@supabase/supabase-js";
import {
  requireSupabaseServiceRoleKey,
  requireSupabaseUrl,
} from "@/lib/supabase/env";

export function createSupabaseAdminClient() {
  return createClient(requireSupabaseUrl(), requireSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
