import "server-only";

export const json = <T>(data: T, status = 200) => Response.json(data, { status });

export const fail = (error: string, status = 400, extra?: Record<string, unknown>) =>
  Response.json({ ok: false, error, ...extra }, { status });

/** Parse a JSON body defensively (bad JSON → null, never a 500). */
export async function readJson<T = unknown>(req: Request, maxBytes = 16_384): Promise<T | null> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) return null;
  try {
    const text = await req.text();
    if (text.length > maxBytes) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Log the real error server-side; tell the client something safe. */
export function serverError(scope: string, err: unknown) {
  console.error(`[${scope}]`, err);
  return fail("Something went wrong on our side. Please try again.", 500);
}
