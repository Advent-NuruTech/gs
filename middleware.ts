import { NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const ROLE_DASHBOARD_PREFIX: Record<string, string> = {
  student: "/dashboard/student",
  teacher: "/dashboard/teacher",
  admin: "/dashboard/admin",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always refresh the Supabase session so tokens stay valid.
  const { response, user } = await updateSession(request);

  if (!pathname.startsWith("/dashboard")) {
    return response;
  }

  const role = request.cookies.get("adventskool_role")?.value;

  const redirectToLogin = () => {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!user || !role) {
    return redirectToLogin();
  }

  if (pathname === "/dashboard") {
    const rolePath = ROLE_DASHBOARD_PREFIX[role];
    return rolePath ? redirectTo(rolePath) : redirectToLogin();
  }

  if (pathname.startsWith("/dashboard/student") && role !== "student") {
    return redirectTo(ROLE_DASHBOARD_PREFIX[role] ?? "/login");
  }

  if (pathname.startsWith("/dashboard/teacher") && role !== "teacher" && role !== "admin") {
    return redirectTo(ROLE_DASHBOARD_PREFIX[role] ?? "/login");
  }

  if (pathname.startsWith("/dashboard/admin") && role !== "admin") {
    return redirectTo(ROLE_DASHBOARD_PREFIX[role] ?? "/login");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
