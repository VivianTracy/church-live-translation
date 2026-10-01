import { NextResponse } from "next/server";
import { invalidateLocalOperatorSession } from "@/lib/operatorLoginAccess";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function POST(request: Request) {
  if (isSupabaseConfigured()) {
    await invalidateLocalOperatorSession();
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl, { status: 303 });
}
