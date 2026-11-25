import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/token";
import { checkApiRequest } from "@/lib/botGuard";

/**
 * Runs before matching routes:
 *  - /api/*   → automation + cross-site filter (see lib/botGuard.ts)
 *  - /admin/* → optimistic gate: no valid admin token → login page. Every admin
 *               page and action still re-validates the user against the database.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    const verdict = checkApiRequest({
      method: req.method,
      path: pathname,
      userAgent: req.headers.get("user-agent"),
      origin: req.headers.get("origin"),
      referer: req.headers.get("referer"),
      host: req.headers.get("x-forwarded-host") ?? req.headers.get("host"),
      allowAutomation: process.env.ALLOW_AUTOMATION === "true",
    });
    if (!verdict.ok) {
      return NextResponse.json({ ok: false, error: verdict.error, code: "BLOCKED" }, { status: verdict.status, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.next();
  }

  if (pathname === "/admin/login") return NextResponse.next();

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET;
  const valid = token && secret ? await verifyAdminToken(token, secret) : null;
  if (!valid) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/admin/:path*", "/api/:path*"] };
