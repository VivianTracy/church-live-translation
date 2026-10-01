import { createBrowserClient } from "@supabase/ssr";
import {
  requireSupabaseAnonKey,
  requireSupabaseUrl,
} from "@/lib/supabase/env";

export function createSupabaseBrowserClient() {
  return createBrowserClient(requireSupabaseUrl(), requireSupabaseAnonKey());
}
