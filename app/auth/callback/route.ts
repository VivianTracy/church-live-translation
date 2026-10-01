import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function safeNextPath(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/reset-password";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nextPath = safeNextPath(url.searchParams.get("next"));
  const destination = new URL(nextPath, url.origin);

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/forgot-password", url.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Password reset callback error:", error);
    return NextResponse.redirect(new URL("/forgot-password", url.origin));
  }

  return NextResponse.redirect(destination);
}
