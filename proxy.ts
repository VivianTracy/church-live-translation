import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  OPERATOR_CHOOSER_PATH,
  OPERATOR_LANGUAGES_PATH,
  OPERATOR_LIVE_PATH,
} from "@/lib/operatorRoutes";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

function isProtectedOperatorPage(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith(OPERATOR_LIVE_PATH) ||
    pathname === OPERATOR_CHOOSER_PATH ||
    pathname.startsWith(OPERATOR_LANGUAGES_PATH)
  );
}

function isPublicAuthPage(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password"
  );
}

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }

  return to;
}

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl()!, getSupabaseAnonKey()!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        supabaseResponse = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (isProtectedOperatorPage(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return copyCookies(supabaseResponse, NextResponse.redirect(loginUrl));
  }

  if (isPublicAuthPage(pathname) && user) {
    const nextPath = request.nextUrl.searchParams.get("next");
    const destination = request.nextUrl.clone();
    destination.pathname =
      nextPath && nextPath.startsWith("/") ? nextPath : OPERATOR_CHOOSER_PATH;
    destination.search = "";
    return copyCookies(supabaseResponse, NextResponse.redirect(destination));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
