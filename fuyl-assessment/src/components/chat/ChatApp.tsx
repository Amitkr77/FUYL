"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { ArrowUp, Check, CheckCircle2, PencilLine, ShieldCheck, Sparkles } from "lucide-react";
import clsx from "clsx";
import type { ChatAsk, ChatMessage, ChatView } from "@/chat/types";
import { MAX_MESSAGE_CHARS } from "@/chat/types";
import { api, ApiError } from "@/lib/client";

const FINISH_STEPS = ["Reading your answers", "Checking ingredient safety", "Matching your ingredients", "Your report is ready"];

/** Typing delay for an assistant message: longer text "types" a little longer. */
const typingMs = (m: ChatMessage) => Math.min(1300, 450 + m.text.length * 6);

export function ChatApp({ initial }: { initial: ChatView }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [chat, setChat] = useState(initial);
  // How many messages are visible. New assistant messages are revealed one by one.
  const [shown, setShown] = useState(() => {
    const fresh = initial.messages.length <= 2 && initial.messages.every((x) => x.role === "assistant");
    return fresh ? 0 : initial.messages.length;
  });
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [finishStep, setFinishStep] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const revealing = shown < chat.messages.length;
  const typing = sending || revealing;

  // Reveal queued assistant messages one at a time with a typing pause.
  useEffect(() => {
    if (shown >= chat.messages.length) return;
    const next = chat.messages[shown];
    const delay = reduce || next.role === "user" ? 0 : typingMs(next);
    const t = setTimeout(() => setShown((s) => s + 1), delay);
    return () => clearTimeout(t);
  }, [shown, chat.messages, reduce]);

  // Keep the newest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [shown, pendingUser, typing, reduce]);

  // After the advisor finishes "typing", put the cursor back in the box (desktop only — avoids popping the phone keyboard).
  useEffect(() => {
    if (!typing && chat.status === "active" && window.matchMedia("(hover: hover) and (pointer: fine)").matches) inputRef.current?.focus();
  }, [typing, chat.status]);

  const apply = useCallback((next: ChatView, previousCount: number) => {
    setChat(next);
    // The user's own message appears instantly; only the replies are "typed".
    const firstAssistant = next.messages.findIndex((x, i) => i >= previousCount && x.role === "assistant");
    setShown(firstAssistant === -1 ? next.messages.length : firstAssistant);
    setPicked([]);
  }, []);

  async function send(body: { text: string } | { choice: { key: string; values?: string[]; number?: number } }, echo: string) {
    if (sending || revealing || !chat.canSend) return;
    setError(null);
    setPendingUser(echo);
    setSending(true);
    const before = chat.messages.length;
    try {
      const minimum = reduce ? Promise.resolve() : new Promise((r) => setTimeout(r, 350));
      const [{ chat: next }] = await Promise.all([api<{ chat: ChatView }>("/api/chat", { method: "POST", body: JSON.stringify(body) }), minimum]);
      apply(next, before);
      if ("text" in body) setText("");
    } catch (err) {
      if (err instanceof ApiError && err.code === "STALE") {
        const r = await api<{ chat: ChatView | null }>("/api/chat").catch(() => null);
        if (r?.chat) apply(r.chat, r.chat.messages.length);
      } else if (err instanceof ApiError && err.code === "NO_SESSION") {
        router.replace("/chat");
        router.refresh();
      } else if (err instanceof ApiError && err.code === "SUBMITTED") {
        router.refresh();
      }
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPendingUser(null);
      setSending(false);
    }
  }

  function submitText(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    void send({ text: t }, t);
  }

  async function finish() {
    if (finishing) return;
    setFinishing(true);
    setError(null);
    const ticker = setInterval(() => setFinishStep((s) => Math.min(s + 1, FINISH_STEPS.length - 1)), reduce ? 200 : 900);
    try {
      const minimum = new Promise((r) => setTimeout(r, reduce ? 300 : 3200));
      const [{ token }] = await Promise.all([api<{ token: string }>("/api/chat/finish", { method: "POST" }), minimum]);
      router.push(`/result/${token}`);
    } catch (err) {
      clearInterval(ticker);
      setFinishing(false);
      setFinishStep(0);
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  const visible = chat.messages.slice(0, shown);
  const last = visible.at(-1);
  const settled = !typing && !revealing;
  const ask = settled && chat.status === "active" ? chat.ask : undefined;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
      <div className="glass-strong flex min-h-[70dvh] flex-1 flex-col overflow-hidden rounded-[var(--radius-glass)] sm:min-h-[640px]">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/60 px-5 py-4 sm:px-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sage to-cream">
            <Sparkles className="h-4.5 w-4.5 text-forest" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-forest">FUYL advisor</p>
            <p className="truncate text-xs text-muted">
              {chat.emailHint ? `Your report will go to ${chat.emailHint}` : "Your personal wellness assessment"}
            </p>
          </div>
          <div
            className="h-1.5 w-20 overflow-hidden rounded-full bg-forest/10 sm:w-28"
            role="progressbar"
            aria-label="Assessment progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(chat.progress * 100)}
          >
            <m.div className="h-full rounded-full bg-gradient-to-r from-teal to-forest" animate={{ width: `${Math.max(4, chat.progress * 100)}%` }} transition={{ duration: 0.6 }} />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6" role="log" aria-live="polite" aria-label="Conversation" data-lenis-prevent>
          <AnimatePresence initial={false}>
            {visible.map((msg) => (
              <Bubble key={msg.id} msg={msg} reduce={Boolean(reduce)} />
            ))}
            {pendingUser !== null && <Bubble key="pending" msg={{ id: "pending", role: "user", text: pendingUser, at: "" }} reduce={Boolean(reduce)} />}
            {typing && <Typing key="typing" />}
          </AnimatePresence>

          {settled && chat.status === "complete" && last?.kind === "recap" && (
            <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2 pl-11">
              <button type="button" onClick={finish} disabled={finishing} className="inline-flex h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-medium text-white hover:bg-forest-soft disabled:opacity-50">
                <CheckCircle2 className="h-4 w-4" aria-hidden /> Looks right, show my results
              </button>
              <Link href="/summary" className="glass inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm text-forest hover:bg-white/80">
                <PencilLine className="h-4 w-4 text-teal-deep" aria-hidden /> Change an answer
              </Link>
            </m.div>
          )}
          {settled && chat.status === "stopped" && (
            <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2 pl-11">
              <Link href="/q" className="glass inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm text-forest hover:bg-white/80">
                <PencilLine className="h-4 w-4 text-teal-deep" aria-hidden /> I made a mistake, change my answer
              </Link>
              <Link href="/" className="inline-flex h-11 items-center rounded-full px-4 text-sm text-teal-deep hover:underline">
                Back to home
              </Link>
            </m.div>
          )}
          {chat.status === "submitted" && chat.resultToken && (
            <div className="pl-11">
              <Link href={`/result/${chat.resultToken}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-medium text-white">
                View my results
              </Link>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        {chat.status === "active" && (
          <div className="border-t border-white/60 bg-white/30 px-4 pb-4 pt-3 sm:px-6">
            {chat.input === "chips" && ask?.options && (
              <Chips ask={ask} picked={picked} setPicked={setPicked} disabled={sending} onSend={(values, labels) => send({ choice: { key: ask.key, values } }, labels)} />
            )}
            <form onSubmit={submitText} className="flex items-center gap-2">
              <label htmlFor="chat-input" className="sr-only">
                Your reply
              </label>
              <input
                id="chat-input"
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
                inputMode={chat.ask?.type === "number" ? "numeric" : "text"}
                enterKeyHint="send"
                autoComplete="off"
                disabled={!chat.canSend}
                placeholder={chat.ask?.type === "number" ? "Type a number…" : chat.ask?.placeholder ?? "Type your reply…"}
                className="h-12 min-w-0 flex-1 rounded-full border border-line bg-white/85 px-5 text-base text-forest outline-none placeholder:text-muted/60 focus:border-teal disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending || revealing || !chat.canSend}
                aria-label="Send"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest text-white transition-opacity hover:bg-forest-soft disabled:opacity-35"
              >
                <ArrowUp className="h-5 w-5" aria-hidden />
              </button>
            </form>
            <p role="alert" aria-live="assertive" className={clsx("text-center text-sm text-ember-deep", error ? "mt-2" : "sr-only")}>
              {error}
            </p>
          </div>
        )}
        {chat.status !== "active" && error && (
          <p role="alert" className="px-6 pb-4 text-center text-sm text-ember-deep">
            {error}
          </p>
        )}
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal-deep" aria-hidden />
        Your chat saves automatically. Not medical advice; for urgent symptoms contact a doctor.
      </p>

      {finishing &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-mist/80 px-6 backdrop-blur-md" role="status" aria-live="polite">
            <div className="glass-strong w-full max-w-sm rounded-[var(--radius-glass)] px-8 py-10 text-center">
              <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-2 border-forest border-t-transparent" aria-hidden />
              <AnimatePresence mode="wait">
                <m.p key={finishStep} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-6 font-display text-2xl text-forest">
                  {FINISH_STEPS[finishStep]}
                </m.p>
              </AnimatePresence>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function Bubble({ msg, reduce }: { msg: ChatMessage; reduce: boolean }) {
  const mine = msg.role === "user";
  return (
    <m.div
      layout={reduce ? false : "position"}
      initial={reduce ? false : { opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={clsx("flex items-end gap-2", mine && "justify-end")}
    >
      {!mine && (
        <span className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage/80" aria-hidden>
          <Sparkles className="h-3.5 w-3.5 text-forest" />
        </span>
      )}
      <div
        className={clsx(
          "max-w-[82%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed",
          mine ? "rounded-br-lg bg-forest text-white" : "rounded-bl-lg bg-white/80 text-forest shadow-[0_8px_24px_-16px_rgba(18,41,31,0.35)]",
          msg.kind === "stop" && "border border-ember/30 bg-[#fff6ef]",
        )}
      >
        <span className="sr-only">{mine ? "You: " : "Advisor: "}</span>
        {msg.text}
        {msg.lines && msg.lines.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-t border-line/60 pt-3 text-sm">
            {msg.lines.map((l) => (
              <li key={l} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" aria-hidden /> {l}
              </li>
            ))}
          </ul>
        )}
      </div>
    </m.div>
  );
}

function Typing() {
  return (
    <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-end gap-2" aria-label="Advisor is typing">
      <span className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage/80" aria-hidden>
        <Sparkles className="h-3.5 w-3.5 text-forest" />
      </span>
      <div className="flex gap-1 rounded-3xl rounded-bl-lg bg-white/80 px-4 py-4">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-teal/70" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </m.div>
  );
}

function Chips({
  ask,
  picked,
  setPicked,
  disabled,
  onSend,
}: {
  ask: ChatAsk;
  picked: string[];
  setPicked: (v: string[]) => void;
  disabled: boolean;
  onSend: (values: string[], labels: string) => void;
}) {
  const opts = ask.options ?? [];
  const label = (vals: string[]) => vals.map((v) => opts.find((o) => o.value === v)?.label ?? v).join(", ");

  function toggle(value: string) {
    const o = opts.find((x) => x.value === value);
    if (picked.includes(value)) return setPicked(picked.filter((v) => v !== value));
    if (o?.exclusive) return setPicked([value]);
    const without = picked.filter((v) => !opts.find((x) => x.value === v)?.exclusive);
    if (ask.maxSelect && without.length >= ask.maxSelect) return;
    setPicked([...without, value]);
  }

  return (
    <div role="group" aria-label="Suggested answers" className="mb-3">
      <div className="-mx-1 flex max-h-40 flex-wrap gap-2 overflow-y-auto px-1 py-0.5" data-lenis-prevent>
        {opts.map((o) => {
          const on = picked.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              disabled={disabled}
              aria-pressed={ask.type === "multi" ? on : undefined}
              onClick={() => (ask.type === "multi" ? toggle(o.value) : onSend([o.value], o.label))}
              className={clsx(
                "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-[background-color,color,border-color] disabled:opacity-50",
                on ? "border-forest bg-forest text-white" : "border-line bg-white/80 text-forest hover:border-teal hover:bg-white",
              )}
            >
              {on && <Check className="h-3.5 w-3.5" aria-hidden />}
              {o.label}
            </button>
          );
        })}
      </div>
      {ask.type === "multi" && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-muted">{ask.maxSelect ? `Pick up to ${ask.maxSelect}` : "Pick any that apply"}</span>
          <button
            type="button"
            disabled={disabled || picked.length === 0}
            onClick={() => onSend(picked, label(picked))}
            className="inline-flex h-9 items-center rounded-full bg-forest px-4 text-sm font-medium text-white disabled:opacity-35"
          >
            Send{picked.length ? ` (${picked.length})` : ""}
          </button>
        </div>
      )}
    </div>
  );
}
