/**
 * First line of defence for the public API, run in the proxy before any route:
 *
 *  1. Automation clients — scripts (curl, wget, Python, Go, Java, Node HTTP
 *     libraries), scrapers and headless browsers announce themselves in the
 *     User-Agent. Real visitors' browsers never do. (Determined attackers can
 *     fake a browser UA — that's what rate limits, the speed check and
 *     Turnstile are for — but this stops the cheap, high-volume stuff.)
 *  2. Cross-site requests — every state-changing call must come from our own
 *     pages (Origin/Referer is this site), so other websites can't drive the
 *     API from their visitors' browsers.
 *
 * Pure function so it can be unit-tested; the proxy supplies the request facts.
 */

const AUTOMATION_UA =
  /(curl|wget|httpie|python-requests|python-urllib|aiohttp|httpx|go-http-client|java\/|okhttp|apache-httpclient|axios|node-fetch|undici|got\s|libwww|lwp::|scrapy|crawler|spider|headlesschrome|phantomjs|puppeteer|playwright|selenium|webdriver|postman|insomnia)/i;

/** Paths that machines are meant to call: health checks and scheduled jobs (they carry their own secret). */
const MACHINE_PATHS = [/^\/api\/health$/, /^\/api\/cron\//];

export interface ApiRequestFacts {
  method: string;
  path: string;
  userAgent: string | null;
  origin: string | null;
  referer: string | null;
  /** The host the request was sent to (Host / X-Forwarded-Host). */
  host: string | null;
  /** Test environments only (ALLOW_AUTOMATION=true): let automated browsers through. */
  allowAutomation: boolean;
}

export type GuardResult = { ok: true } | { ok: false; status: number; error: string };

const hostOf = (url: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
};

export function checkApiRequest(r: ApiRequestFacts): GuardResult {
  if (!r.path.startsWith("/api/") || MACHINE_PATHS.some((re) => re.test(r.path))) return { ok: true };

  if (!r.allowAutomation) {
    const ua = (r.userAgent ?? "").trim();
    if (ua.length < 10 || AUTOMATION_UA.test(ua)) {
      return { ok: false, status: 403, error: "Automated requests aren't allowed. Please use the website." };
    }
  }

  const safe = r.method === "GET" || r.method === "HEAD" || r.method === "OPTIONS";
  if (!safe) {
    const host = r.host?.toLowerCase() ?? null;
    const from = hostOf(r.origin) ?? hostOf(r.referer);
    if (!host || !from || from !== host) {
      return { ok: false, status: 403, error: "This request must come from the FUYL assessment website." };
    }
  }
  return { ok: true };
}
