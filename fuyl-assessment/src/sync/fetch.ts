import "server-only";

/**
 * Polite HTTP fetch for fuyl.in: identifies itself, times out, retries once
 * on network errors / 5xx / 429, and never caches (we want fresh data).
 */
const USER_AGENT = "FUYL-Assessment-Sync/1.0 (+https://fuyl.in)";

export async function fetchText(url: string, { timeoutMs = 12_000, retries = 1 } = {}): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/json;q=0.9,*/*;q=0.5" },
        cache: "no-store",
        redirect: "follow",
        signal: controller.signal,
      });
      if (res.ok) return await res.text();
      lastError = new Error(`${url} responded ${res.status}`);
      if (res.status !== 429 && res.status < 500) break; // 4xx won't fix itself
    } catch (err) {
      lastError = err instanceof Error && err.name === "AbortError" ? new Error(`${url} timed out`) : err;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function fetchJson(url: string): Promise<unknown> {
  return JSON.parse(await fetchText(url));
}
