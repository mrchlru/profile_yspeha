import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SCREENING_MAX_STEP_COOKIE } from "@/lib/screeningProgressCookie";
import { readAdminAuthConfig } from "@/lib/admin/adminAuthConfig";
import { getAdminSessionFromRequest } from "@/lib/admin/adminSession";

function _requiredStepForPath(pathname: string): number | null {
  if (pathname === "/step-2" || pathname.startsWith("/step-2/")) {
    return 2;
  }
  if (pathname === "/step-3" || pathname.startsWith("/step-3/")) {
    return 3;
  }
  if (pathname === "/step-4" || pathname.startsWith("/step-4/")) {
    return 4;
  }
  return null;
}

function _isAdminPublicPath(pathname: string): boolean {
  return pathname === "/admin/login" || pathname.startsWith("/admin/login/");
}

function _isAdminApiPublicPath(pathname: string): boolean {
  return pathname === "/api/admin/auth/login";
}

async function _guardAdminPanel(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApi = pathname.startsWith("/api/admin/");

  if (!isAdminPage && !isAdminApi) {
    return null;
  }

  if (_isAdminPublicPath(pathname) || _isAdminApiPublicPath(pathname)) {
    return null;
  }

  const config = readAdminAuthConfig();
  if (!config) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Админ-панель не настроена" }, { status: 503 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const session = await getAdminSessionFromRequest(request, config.sessionSecret);
  if (session) {
    return null;
  }

  if (isAdminApi) {
    return NextResponse.json({ error: "Требуется вход в админ-панель" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const adminGuard = await _guardAdminPanel(request);
  if (adminGuard) {
    return adminGuard;
  }

  const required = _requiredStepForPath(request.nextUrl.pathname);
  if (required === null) {
    return NextResponse.next();
  }

  const raw = request.cookies.get(SCREENING_MAX_STEP_COOKIE)?.value;
  const unlocked = raw ? Number.parseInt(raw, 10) : 0;
  if (Number.isNaN(unlocked) || unlocked < required) {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        scope: "screening",
        phase: "middleware",
        message: "step_gated_redirect",
        path: request.nextUrl.pathname,
        requiredStep: required,
        maxStepCookie: unlocked,
      })
    );
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/step-2", "/step-3", "/step-4", "/admin", "/admin/:path*", "/api/admin/:path*"],
};
