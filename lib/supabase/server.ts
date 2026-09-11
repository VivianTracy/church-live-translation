import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  requireSupabaseAnonKey,
  requireSupabaseUrl,
} from "@/lib/supabase/env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(requireSupabaseUrl(), requireSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot always set cookies. Proxy refreshes the session.
        }
      },
    },
  });
}
