import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  OPERATOR_CHOOSER_PATH,
  OPERATOR_LANGUAGES_PATH,
  OPERATOR_LIVE_PATH,
  OPERATOR_PHONE_PATH,
  operatorLoginNextPath,
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
    pathname.startsWith(OPERATOR_LANGUAGES_PATH) ||
    pathname === OPERATOR_PHONE_PATH ||
    pathname.startsWith(`${OPERATOR_PHONE_PATH}/`)
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
    loginUrl.search = "";
    loginUrl.searchParams.set(
      "next",
      operatorLoginNextPath(
        pathname === OPERATOR_PHONE_PATH
          ? `${pathname}${request.nextUrl.search}`
          : pathname
      )
    );
    return copyCookies(supabaseResponse, NextResponse.redirect(loginUrl));
  }

  if (isPublicAuthPage(pathname) && user) {
    const next = operatorLoginNextPath(request.nextUrl.searchParams.get("next"));
    const parsed = new URL(next, request.url);
    const destination = request.nextUrl.clone();
    destination.pathname = parsed.pathname;
    destination.search = parsed.search;
    return copyCookies(supabaseResponse, NextResponse.redirect(destination));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
