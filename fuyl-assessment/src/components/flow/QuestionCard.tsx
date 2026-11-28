"use client";

import { AnimatePresence, m } from "motion/react";
import { ArrowUp, Check, ChevronDown, Info, Sparkles } from "lucide-react";
import clsx from "clsx";
import { useEffect, useId, useRef, useState } from "react";
import type { Answer, AnswerInput } from "@/engine";
import type { ClientOption, ClientQuestion } from "@/flow/state";
import { Button } from "@/components/ui/Button";

/**
 * One question, one screen. Single-choice answers advance automatically after
 * a short "pressed" beat; multi-choice, number and text questions use Continue.
 *
 * Assisted assessment (`assist`): the same card, plus a box to answer in your
 * own words, which the assistant turns into the matching option. With
 * `showOptions: false` (admin "free text only") the options are hidden.
 */
export interface AssistProps {
  showOptions: boolean;
  /** After a typed answer wasn't understood: draw attention to the tiles. */
  highlightOptions?: boolean;
  /** Follow-up from the assistant when a typed answer wasn't clear. */
  clarify: string | null;
  onText: (text: string) => void;
}

export function QuestionCard({
  question,
  answer,
  busy,
  error,
  onSubmit,
  assist,
}: {
  question: ClientQuestion;
  answer?: Answer;
  busy: boolean;
  error: string | null;
  onSubmit: (input: AnswerInput) => void;
  assist?: AssistProps;
}) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // After a question changes, move focus to its heading (choice questions) so
  // keyboard and screen-reader users land on the new question instead of the
  // page body. Text/number questions focus their input instead.
  useEffect(() => {
    if (question.type === "number" || question.type === "text") return;
    const t = setTimeout(() => headingRef.current?.focus({ preventScroll: true }), 50);
    return () => clearTimeout(t);
  }, [question.key, question.type]);

  return (
    <div>
      <h1
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="text-balance text-center font-display text-[1.65rem] leading-[1.15] text-forest outline-none sm:text-[2.2rem]"
      >
        {question.prompt}
      </h1>
      {question.helper && <p className="mt-3 text-center text-sm text-muted">{question.helper}</p>}
      {question.why && <WhyWeAsk text={question.why} />}

      <div className="mt-6">
        <div className={clsx("rounded-3xl transition-shadow duration-500", assist?.highlightOptions && "shadow-[0_0_0_3px_rgba(85,132,118,0.35)] p-2")}>
          {question.type === "single" && question.display === "select" && (!assist || assist.showOptions) && (
            <SelectChoice question={question} answer={answer} busy={busy} labelledBy={headingId} onSubmit={onSubmit} />
          )}
          {question.type === "grid" && <GridChoice question={question} answer={answer} busy={busy} labelledBy={headingId} onSubmit={onSubmit} />}
          {question.type === "single" && question.display !== "select" && (!assist || assist.showOptions) && (
            <SingleChoice question={question} answer={answer} busy={busy} labelledBy={headingId} onSubmit={onSubmit} />
          )}
          {question.type === "multi" && (!assist || assist.showOptions) && (
            <MultiChoice question={question} answer={answer} busy={busy} labelledBy={headingId} onSubmit={onSubmit} />
          )}
        </div>
        {(question.type === "number" || question.type === "text") && (
          <FreeInput question={question} answer={answer} busy={busy} labelledBy={headingId} onSubmit={onSubmit} onText={assist?.onText} />
        )}
        {assist && (question.type === "single" || question.type === "multi") && (
          <AssistBox key={question.key} question={question} busy={busy} prominent={!assist.showOptions} onText={assist.onText} labelledBy={headingId} />
        )}
        {assist?.clarify && (
          <p role="status" className="mx-auto mt-4 flex max-w-md items-start justify-center gap-2 text-center text-sm text-teal-deep">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              {assist.clarify}
              {assist.highlightOptions && assist.showOptions && (question.type === "single" || question.type === "multi") && (
                <strong className="block font-medium text-forest">Or just tap one of the answers above.</strong>
              )}
            </span>
          </p>
        )}
      </div>

      <p role="alert" aria-live="polite" className="mt-4 min-h-5 text-center text-sm text-ember-deep">
        {error}
      </p>
    </div>
  );
}

function WhyWeAsk({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="mt-3 flex flex-col items-center">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-[13px] font-medium text-ember-deep hover:text-ember-deep"
      >
        Why we ask?
        <ChevronDown className={clsx("h-3.5 w-3.5 transition-transform duration-300", open && "rotate-180")} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.p
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-md overflow-hidden text-center text-[13px] leading-relaxed text-muted"
          >
            <span className="block pt-2">{text}</span>
          </m.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const grid = (n: number) =>
  clsx(
    "grid gap-3",
    n === 3 ? "grid-cols-1 sm:grid-cols-3" : n === 2 || n === 4 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  );

function OptionTile({
  option,
  selected,
  onClick,
  multi,
  index,
  disabled,
}: {
  option: ClientOption;
  selected: boolean;
  onClick: () => void;
  multi: boolean;
  index: number;
  disabled?: boolean;
}) {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <m.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 + index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={clsx("relative h-full", option.exclusive && "col-span-full")}
    >
      <m.button
        type="button"
        role={multi ? "checkbox" : "radio"}
        aria-checked={selected}
        disabled={disabled}
        onClick={onClick}
        whileHover={disabled ? undefined : { y: -2 }}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={clsx(
          "group relative flex h-full w-full items-center gap-3 rounded-2xl px-5 py-3.5 text-left text-[15px] transition-[background-color,color,box-shadow] duration-200",
          selected
            ? "bg-forest text-white shadow-[0_16px_36px_-16px_rgba(18,41,31,0.7)]"
            : "glass text-forest hover:bg-white/75 hover:shadow-[0_18px_40px_-22px_rgba(18,41,31,0.45)]",
        )}
      >
        <span
          className={clsx(
            "flex h-5 w-5 shrink-0 items-center justify-center border transition-colors",
            multi ? "rounded-md" : "rounded-full",
            selected ? "border-white/60 bg-white/15" : "border-line bg-white/60",
          )}
          aria-hidden
        >
          <AnimatePresence>
            {selected && (
              <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 25 }}>
                <Check className="h-3.5 w-3.5" />
              </m.span>
            )}
          </AnimatePresence>
        </span>
        <span className={clsx("flex-1", option.info && "pr-8")}>{option.label}</span>
      </m.button>
      {option.info && (
        <button
          type="button"
          aria-label={`More about ${option.label}`}
          aria-expanded={showInfo}
          onClick={() => setShowInfo((s) => !s)}
          className={clsx(
            "absolute right-3 top-[1.65rem] -translate-y-1/2 rounded-full p-1.5 transition-colors",
            selected ? "text-white/80 hover:text-white" : "text-teal hover:text-forest",
          )}
        >
          <Info className="h-4 w-4" aria-hidden />
        </button>
      )}
      <AnimatePresence initial={false}>
        {showInfo && option.info && (
          <m.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-5 text-[13px] text-muted"
          >
            <span className="block pt-2">{option.info}</span>
          </m.p>
        )}
      </AnimatePresence>
    </m.div>
  );
}

function SingleChoice({
  question,
  answer,
  busy,
  labelledBy,
  onSubmit,
}: {
  question: ClientQuestion;
  answer?: Answer;
  busy: boolean;
  labelledBy: string;
  onSubmit: (input: AnswerInput) => void;
}) {
  const [picked, setPicked] = useState<string | undefined>(answer?.values?.[0]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const options = question.options ?? [];

  const choose = (value: string) => {
    if (busy) return;
    tapFeedback();
    setPicked(value);
    clearTimeout(timer.current);
    // A short beat so the selection registers visually before moving on.
    timer.current = setTimeout(() => onSubmit({ values: [value] }), 260);
  };
  useNumberKeys(options.length, (i) => choose(options[i].value));

  return (
    <>
      <div role="radiogroup" aria-labelledby={labelledBy} className={grid(options.length)}>
        {options.map((o, i) => (
          <OptionTile key={o.value} option={o} index={i} multi={false} selected={picked === o.value} disabled={busy} onClick={() => choose(o.value)} />
        ))}
      </div>
      <KeyHint count={options.length} />
    </>
  );
}

/** A tiny vibration on Android when an answer is tapped (no-op elsewhere). */
function tapFeedback() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
}

/** Desktop shortcut: number keys 1–9 pick the matching option (ignored while typing). */
function useNumberKeys(count: number, onPick: (index: number) => void) {
  const handler = useRef(onPick);
  useEffect(() => {
    handler.current = onPick;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= Math.min(9, count)) {
        e.preventDefault();
        handler.current(n - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count]);
}

function KeyHint({ count, enter }: { count: number; enter?: boolean }) {
  if (count < 2) return null;
  return (
    // Only on devices with a real pointer + keyboard.
    <p className="mt-4 hidden text-center text-xs text-muted [@media(hover:hover)_and_(pointer:fine)]:block">
      Tip: press <kbd className="rounded border border-line bg-white/70 px-1">1</kbd>–<kbd className="rounded border border-line bg-white/70 px-1">{Math.min(9, count)}</kbd> to choose
      {enter ? (
        <>
          , <kbd className="rounded border border-line bg-white/70 px-1">Enter</kbd> to continue
        </>
      ) : null}
    </p>
  );
}

function MultiChoice({
  question,
  answer,
  busy,
  labelledBy,
  onSubmit,
}: {
  question: ClientQuestion;
  answer?: Answer;
  busy: boolean;
  labelledBy: string;
  onSubmit: (input: AnswerInput) => void;
}) {
  const [picked, setPicked] = useState<string[]>(answer?.values ?? []);
  const [hint, setHint] = useState<string | null>(null);
  const options = question.options ?? [];
  const exclusive = new Set(options.filter((o) => o.exclusive).map((o) => o.value));

  function toggle(value: string) {
    if (busy) return;
    tapFeedback();
    setHint(null);
    setPicked((cur) => {
      if (cur.includes(value)) return cur.filter((v) => v !== value);
      if (exclusive.has(value)) return [value]; // "None of these" clears the rest
      const next = [...cur.filter((v) => !exclusive.has(v)), value];
      if (question.maxSelect && next.length > question.maxSelect) {
        setHint(`You can pick up to ${question.maxSelect}.`);
        return cur;
      }
      return next;
    });
  }
  useNumberKeys(options.length, (i) => toggle(options[i].value));
  // Enter continues once something is picked (unless focus is on a button/input).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "Enter" || (t && ["INPUT", "TEXTAREA", "BUTTON", "A"].includes(t.tagName))) return;
      if (picked.length > 0 && !busy) {
        e.preventDefault();
        onSubmit({ values: picked });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picked, busy, onSubmit]);

  return (
    <>
      <div role="group" aria-labelledby={labelledBy} className={grid(options.length)}>
        {options.map((o, i) => (
          <OptionTile key={o.value} option={o} index={i} multi selected={picked.includes(o.value)} disabled={busy} onClick={() => toggle(o.value)} />
        ))}
      </div>
      <p aria-live="polite" className="mt-3 min-h-5 text-center text-[13px] text-teal-deep">
        {hint ?? (question.maxSelect ? `${picked.length} of ${question.maxSelect} selected` : "")}
      </p>
      <StickyAction>
        <Button size="lg" disabled={picked.length === 0} loading={busy} onClick={() => onSubmit({ values: picked })}>
          Continue
        </Button>
      </StickyAction>
      <KeyHint count={options.length} enter />
    </>
  );
}

function FreeInput({
  question,
  answer,
  busy,
  labelledBy,
  onSubmit,
  onText,
}: {
  question: ClientQuestion;
  answer?: Answer;
  busy: boolean;
  labelledBy: string;
  onSubmit: (input: AnswerInput) => void;
  /** Assisted: send whatever was typed ("I'm thirty-one") to the assistant instead. */
  onText?: (text: string) => void;
}) {
  const isNumber = question.type === "number" && !onText;
  const initial = isNumber ? (answer?.number?.toString() ?? "") : (answer?.text ?? "");
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus({ preventScroll: true }), 350);
    return () => clearTimeout(t);
  }, []);

  const submit = () => {
    if (!value.trim()) return;
    if (onText) return onText(value.trim());
    onSubmit(isNumber ? { number: value.trim() } : { text: value });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mx-auto flex max-w-sm flex-col items-center"
    >
      <div className="glass flex w-full items-center rounded-2xl px-5">
        <input
          ref={ref}
          aria-labelledby={labelledBy}
          value={value}
          onChange={(e) => setValue(isNumber ? e.target.value.replace(/\D/g, "").slice(0, 3) : e.target.value)}
          inputMode={isNumber ? "numeric" : "text"}
          autoComplete={question.type === "number" ? "off" : "given-name"}
          maxLength={isNumber ? 3 : onText ? 200 : question.maxLength}
          placeholder={onText && question.type === "number" ? "e.g. 31, or “I'm thirty-one”" : question.placeholder}
          className="h-16 w-full bg-transparent text-center text-xl text-forest outline-none placeholder:text-muted/50"
        />
        {isNumber && question.unit && <span className="text-sm text-muted">{question.unit}</span>}
      </div>
      <Button type="submit" size="lg" className="mt-6" disabled={!value.trim()} loading={busy}>
        Continue
      </Button>
    </form>
  );
}

/** Assisted: answer a choice question in your own words. */
function AssistBox({
  question,
  busy,
  prominent,
  onText,
  labelledBy,
}: {
  question: ClientQuestion;
  busy: boolean;
  prominent: boolean;
  onText: (text: string) => void;
  labelledBy: string;
}) {
  const [value, setValue] = useState("");
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!prominent) return;
    const t = setTimeout(() => ref.current?.focus({ preventScroll: true }), 350);
    return () => clearTimeout(t);
  }, [prominent]);
  const examples = (question.options ?? [])
    .filter((o) => !o.exclusive)
    .slice(0, 2)
    .map((o) => o.label.toLowerCase());

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onText(value.trim());
      }}
      className={clsx("mx-auto max-w-xl", prominent ? "" : "mt-6")}
    >
      {!prominent && (
        <div className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-muted" aria-hidden>
          <span className="h-px flex-1 bg-line/70" /> or answer in your own words <span className="h-px flex-1 bg-line/70" />
        </div>
      )}
      <label htmlFor={id} className="sr-only">
        Answer in your own words
      </label>
      <div className="glass flex items-center gap-2 rounded-2xl py-1.5 pl-4 pr-1.5 focus-within:ring-2 focus-within:ring-teal/30">
        <Sparkles className="h-4 w-4 shrink-0 text-teal-deep" aria-hidden />
        <input
          ref={ref}
          id={id}
          aria-describedby={labelledBy}
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, 500))}
          disabled={busy}
          autoComplete="off"
          enterKeyHint="send"
          placeholder={examples.length ? `e.g. “${examples.join("” or “")}”` : "Type your answer…"}
          className={clsx("w-full bg-transparent text-forest outline-none placeholder:text-muted/60", prominent ? "h-14 text-lg" : "h-11 text-base")}
        />
        <button
          type="submit"
          disabled={busy || !value.trim()}
          aria-label="Send answer"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest text-white transition-opacity disabled:opacity-35"
        >
          {busy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
          ) : (
            <ArrowUp className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
    </form>
  );
}

/** Long lists (country, state): a dropdown + Continue. */
function SelectChoice({
  question,
  answer,
  busy,
  labelledBy,
  onSubmit,
}: {
  question: ClientQuestion;
  answer?: Answer;
  busy: boolean;
  labelledBy: string;
  onSubmit: (input: AnswerInput) => void;
}) {
  const [value, setValue] = useState(answer?.values?.[0] ?? "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value) onSubmit({ values: [value] });
      }}
      className="mx-auto flex max-w-md flex-col items-center"
    >
      <div className="glass relative w-full rounded-2xl focus-within:ring-2 focus-within:ring-teal/30">
        <select
          aria-labelledby={labelledBy}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={busy}
          className="h-16 w-full appearance-none rounded-2xl bg-transparent px-5 pr-12 text-lg text-forest outline-none"
        >
          <option value="" disabled>
            Choose…
          </option>
          {(question.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
      </div>
      <Button type="submit" size="lg" className="mt-6" disabled={!value} loading={busy}>
        Continue
      </Button>
    </form>
  );
}

/** "Typical week": one row per food group, each with the same how-often scale. */
function GridChoice({
  question,
  answer,
  busy,
  labelledBy,
  onSubmit,
}: {
  question: ClientQuestion;
  answer?: Answer;
  busy: boolean;
  labelledBy: string;
  onSubmit: (input: AnswerInput) => void;
}) {
  const rows = question.rows ?? [];
  const options = question.options ?? [];
  const [picked, setPicked] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(answer?.grid ?? {}).filter(([k]) => rows.some((r) => r.key === k))),
  );
  const done = rows.filter((r) => picked[r.key]).length;
  const complete = done === rows.length;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (complete) onSubmit({ grid: picked });
      }}
      aria-labelledby={labelledBy}
    >
      {/* One food per row: name on the left, the how-often choices on the right (stacked on phones). */}
      <ul className="space-y-2">
        {rows.map((r) => {
          const groupId = `${question.key}-${r.key}`;
          return (
            <li key={r.key} className="glass flex flex-col gap-2.5 rounded-2xl px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-4">
              <div className="min-w-0">
                <p id={groupId} className="flex items-center gap-2 text-[15px] font-medium text-forest">
                  {picked[r.key] && <Check className="h-4 w-4 shrink-0 text-teal-deep" aria-hidden />}
                  {r.label}
                </p>
                {r.helper && <p className="mt-0.5 text-xs text-muted">{r.helper}</p>}
              </div>
              <div role="radiogroup" aria-labelledby={groupId} className="flex shrink-0 flex-wrap gap-1.5 md:flex-nowrap">
                {options.map((o) => {
                  const on = picked[r.key] === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={busy}
                      onClick={() => {
                        tapFeedback();
                        setPicked((p) => ({ ...p, [r.key]: o.value }));
                      }}
                      className={clsx(
                        "rounded-full px-3 py-1.5 text-[13px] transition-colors",
                        on ? "bg-forest text-white" : "border border-line bg-white/60 text-forest hover:bg-white",
                      )}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
      <StickyAction>
        <div className="flex flex-col items-center gap-1.5">
          <Button type="submit" size="lg" disabled={!complete} loading={busy}>
            Continue
          </Button>
          <p className="text-xs text-muted" aria-live="polite">
            {complete ? "All set" : `${done} of ${rows.length} answered`}
          </p>
        </div>
      </StickyAction>
    </form>
  );
}

/**
 * The main action for long questions: stays pinned to the bottom of the screen
 * while the options scroll, then settles in place under them.
 */
function StickyAction({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-5 mt-3 flex justify-center bg-gradient-to-t from-white/95 via-white/80 to-transparent px-5 pb-4 pt-6 sm:-mx-10 sm:px-10">
      {children}
    </div>
  );
}
