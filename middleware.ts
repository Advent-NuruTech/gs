import { NextRequest, NextResponse } from "next/server";

const ROLE_DASHBOARD_PREFIX: Record<string, string> = {
  student: "/dashboard/student",
  teacher: "/dashboard/teacher",
  admin: "/dashboard/admin",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const redirectToLogin = () => {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  };

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const uid = request.cookies.get("adventskool_uid")?.value;
  const role = request.cookies.get("adventskool_role")?.value;

  if (!uid || !role) {
    return redirectToLogin();
  }

  if (pathname === "/dashboard") {
    const rolePath = ROLE_DASHBOARD_PREFIX[role];
    if (!rolePath) {
      return redirectToLogin();
    }
    return NextResponse.redirect(new URL(rolePath, request.url));
  }

  if (pathname.startsWith("/dashboard/student") && role !== "student") {
    return NextResponse.redirect(new URL(ROLE_DASHBOARD_PREFIX[role] ?? "/login", request.url));
  }

  if (pathname.startsWith("/dashboard/teacher") && role !== "teacher" && role !== "admin") {
    return NextResponse.redirect(new URL(ROLE_DASHBOARD_PREFIX[role] ?? "/login", request.url));
  }

  if (pathname.startsWith("/dashboard/admin") && role !== "admin") {
    return NextResponse.redirect(new URL(ROLE_DASHBOARD_PREFIX[role] ?? "/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
