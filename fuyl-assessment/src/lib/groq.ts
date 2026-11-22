import "server-only";
import type { AiPort, AiRequest } from "@/chat/ai";
import { env } from "@/lib/env";

/**
 * Groq chat-completions client (OpenAI-compatible API). Returns parsed JSON or
 * throws — the chat treats any throw as "AI unavailable" and continues with
 * its built-in understanding, so users never see a provider error.
 *
 * Models that support strict JSON-schema output on Groq (gpt-oss, qwen) get
 * it; others get JSON-object mode with the schema described in the prompt.
 */

export class AiUnavailable extends Error {
  constructor(
    public kind: "no-key" | "rate-limit" | "timeout" | "http" | "bad-output",
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = "AiUnavailable";
  }
}

const STRICT_MODELS = /gpt-oss|qwen|muse-spark/i;
const TIMEOUT_MS = 12_000;

export interface GroqUsage {
  promptTokens: number;
  completionTokens: number;
}

export async function groqJson(model: string, req: AiRequest, signal?: AbortSignal): Promise<{ data: unknown; usage: GroqUsage }> {
  const { GROQ_API_KEY, GROQ_BASE_URL } = env();
  if (!GROQ_API_KEY) throw new AiUnavailable("no-key", "GROQ_API_KEY is not set");

  const strict = STRICT_MODELS.test(model);
  const messages = strict
    ? req.messages
    : [
        ...req.messages.slice(0, 1).map((m) => ({ ...m, content: `${m.content}\n\nJSON schema to follow exactly:\n${JSON.stringify(req.schema)}` })),
        ...req.messages.slice(1),
      ];

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.4,
    max_completion_tokens: req.maxTokens,
    response_format: strict
      ? { type: "json_schema", json_schema: { name: req.schemaName, strict: true, schema: req.schema } }
      : { type: "json_object" },
  };
  if (/gpt-oss/i.test(model)) {
    // Keep reasoning short (latency + free-tier token limits) and out of the response.
    body.reasoning_effort = "low";
    body.include_reasoning = false;
  }

  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${GROQ_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      cache: "no-store",
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new AiUnavailable(timedOut ? "timeout" : "http", timedOut ? "Groq request timed out" : `Groq request failed: ${String(err)}`);
  }

  if (res.status === 429) {
    throw new AiUnavailable("rate-limit", "Groq rate limit reached", Number(res.headers.get("retry-after")) || undefined);
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    throw new AiUnavailable("http", `Groq HTTP ${res.status}: ${detail}`);
  }

  const payload = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  } | null;
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new AiUnavailable("bad-output", "Groq returned no content");
  let data: unknown;
  try {
    data = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    throw new AiUnavailable("bad-output", "Groq returned invalid JSON");
  }
  return {
    data,
    usage: { promptTokens: payload?.usage?.prompt_tokens ?? 0, completionTokens: payload?.usage?.completion_tokens ?? 0 },
  };
}

/**
 * An AiPort bound to a model that also enforces the daily cap and records
 * usage. `reserve` returns false when the cap is used up (→ fallback).
 */
export function groqPort(
  model: string,
  hooks: {
    reserve: () => Promise<boolean>;
    record: (u: { failure?: boolean; promptTokens?: number; completionTokens?: number }) => Promise<void>;
  },
): AiPort {
  return {
    async json(req) {
      if (!(await hooks.reserve())) throw new AiUnavailable("rate-limit", "Daily AI cap reached");
      try {
        const { data, usage } = await groqJson(model, req);
        await hooks.record(usage).catch(() => {});
        return data;
      } catch (err) {
        await hooks.record({ failure: true }).catch(() => {});
        if (err instanceof AiUnavailable && err.kind !== "rate-limit") console.warn(`[ai] ${err.kind}: ${err.message}`);
        throw err;
      }
    },
  };
}
