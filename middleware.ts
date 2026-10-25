import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  // Custom domains are attached and verified manually by AdventSkool. Only a
  // request explicitly marked ready may route its root to a creator storefront.
  // All tenant domains still share this one application and deployment.
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const hostname = forwardedHost.split(":")[0].toLowerCase().replace(/^www\./, "");
  let officialHostname = "adventskool.co.ke";
  try {
    officialHostname = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://adventskool.co.ke").hostname.replace(/^www\./, "");
  } catch {}
  const isPotentialCustomDomain = Boolean(
    hostname &&
    hostname !== officialHostname &&
    hostname !== "localhost" &&
    !hostname.endsWith(".localhost") &&
    !hostname.endsWith(".vercel.app")
  );

  if (pathname === "/" && isPotentialCustomDomain && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: domain } = await admin
      .from("creator_domain_requests")
      .select("creator_id")
      .eq("requested_domain", hostname)
      .eq("status", "ready")
      .maybeSingle();
    if (domain?.creator_id) {
      const { data: creator } = await admin
        .from("profiles")
        .select("handle,role,creator_status,suspended_until")
        .eq("id", domain.creator_id)
        .maybeSingle();
      const suspended = creator?.suspended_until && new Date(String(creator.suspended_until)).getTime() > Date.now();
      if (creator?.handle && creator.role === "teacher" && ["pending", "approved"].includes(String(creator.creator_status)) && !suspended) {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = `/@${creator.handle}`;
        const rewrite = NextResponse.rewrite(rewriteUrl);
        response.cookies.getAll().forEach((cookie) => rewrite.cookies.set(cookie));
        return rewrite;
      }
    }
  }

  const isAdventPayProtectedRoute = pathname === "/adventpay/dashboard" || pathname.startsWith("/adventpay/dashboard/") || pathname === "/adventpay/admin" || pathname.startsWith("/adventpay/admin/");
  if (!pathname.startsWith("/dashboard") && !isAdventPayProtectedRoute) {
    return response;
  }

  const role = request.cookies.get("adventskool_role")?.value;

  const redirectToLogin = () => {
    const loginUrl = new URL(pathname.startsWith("/adventpay") ? "/adventpay/login" : "/login", request.url);
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

  if (isAdventPayProtectedRoute) {
    if (pathname.startsWith("/adventpay/admin") && role !== "admin") return redirectTo("/adventpay/dashboard");
    return response;
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
