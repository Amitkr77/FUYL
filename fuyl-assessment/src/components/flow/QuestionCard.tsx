"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Info } from "lucide-react";
import clsx from "clsx";
import { useEffect, useId, useRef, useState } from "react";
import type { Answer, AnswerInput } from "@/engine";
import type { ClientOption, ClientQuestion } from "@/flow/state";
import { Button } from "@/components/ui/Button";

/**
 * One question, one screen. Single-choice answers advance automatically after
 * a short "pressed" beat; multi-choice, number and text questions use Continue.
 */
export function QuestionCard({
  question,
  answer,
  busy,
  error,
  onSubmit,
}: {
  question: ClientQuestion;
  answer?: Answer;
  busy: boolean;
  error: string | null;
  onSubmit: (input: AnswerInput) => void;
}) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // After a question changes, move focus to its heading (choice questions) so
  // keyboard and screen-reader users land on the new question instead of the
  // page body. Text/number questions focus their input instead.
  useEffect(() => {
    if (question.type !== "single" && question.type !== "multi") return;
    const t = setTimeout(() => headingRef.current?.focus({ preventScroll: true }), 50);
    return () => clearTimeout(t);
  }, [question.key, question.type]);

  return (
    <div>
      <h1
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="text-balance text-center font-display text-[2rem] leading-[1.12] text-forest outline-none sm:text-[2.6rem]"
      >
        {question.prompt}
      </h1>
      {question.helper && <p className="mt-3 text-center text-sm text-muted">{question.helper}</p>}
      {question.why && <WhyWeAsk text={question.why} />}

      <div className="mt-8">
        {question.type === "single" && (
          <SingleChoice question={question} answer={answer} busy={busy} labelledBy={headingId} onSubmit={onSubmit} />
        )}
        {question.type === "multi" && (
          <MultiChoice question={question} answer={answer} busy={busy} labelledBy={headingId} onSubmit={onSubmit} />
        )}
        {(question.type === "number" || question.type === "text") && (
          <FreeInput question={question} answer={answer} busy={busy} labelledBy={headingId} onSubmit={onSubmit} />
        )}
      </div>

      <p role="alert" aria-live="polite" className="mt-4 min-h-5 text-center text-sm text-ember">
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
        className="inline-flex items-center gap-1 text-[13px] font-medium text-ember/90 hover:text-ember"
      >
        Why we ask?
        <ChevronDown className={clsx("h-3.5 w-3.5 transition-transform duration-300", open && "rotate-180")} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.p
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-md overflow-hidden text-center text-[13px] leading-relaxed text-muted"
          >
            <span className="block pt-2">{text}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const grid = (n: number) =>
  clsx("grid gap-3", n <= 3 ? "grid-cols-1" : n === 4 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2");

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
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 + index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={clsx("relative", option.exclusive && "sm:col-span-2")}
    >
      <motion.button
        type="button"
        role={multi ? "checkbox" : "radio"}
        aria-checked={selected}
        disabled={disabled}
        onClick={onClick}
        whileHover={disabled ? undefined : { y: -2 }}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={clsx(
          "group relative flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-left text-[15px] transition-[background-color,color,box-shadow] duration-200",
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
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 25 }}>
                <Check className="h-3.5 w-3.5" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span className={clsx("flex-1", option.info && "pr-8")}>{option.label}</span>
      </motion.button>
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
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-5 text-[13px] text-muted"
          >
            <span className="block pt-2">{option.info}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
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

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className={grid(options.length)}>
      {options.map((o, i) => (
        <OptionTile
          key={o.value}
          option={o}
          index={i}
          multi={false}
          selected={picked === o.value}
          disabled={busy}
          onClick={() => {
            setPicked(o.value);
            clearTimeout(timer.current);
            // A short beat so the selection registers visually before moving on.
            timer.current = setTimeout(() => onSubmit({ values: [o.value] }), 260);
          }}
        />
      ))}
    </div>
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
      <div className="mt-3 flex justify-center">
        <Button size="lg" disabled={picked.length === 0} loading={busy} onClick={() => onSubmit({ values: picked })}>
          Continue
        </Button>
      </div>
    </>
  );
}

function FreeInput({
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
  const isNumber = question.type === "number";
  const initial = isNumber ? (answer?.number?.toString() ?? "") : (answer?.text ?? "");
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus({ preventScroll: true }), 350);
    return () => clearTimeout(t);
  }, []);

  const submit = () => {
    if (!value.trim()) return;
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
          autoComplete={isNumber ? "off" : "given-name"}
          maxLength={isNumber ? 3 : question.maxLength}
          placeholder={question.placeholder}
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
