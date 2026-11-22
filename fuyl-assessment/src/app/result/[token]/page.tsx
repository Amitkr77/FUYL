import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Info, Leaf, Mail, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import type { AssessmentResult, ResultArea, SafetyNote } from "@/engine";
import { Reveal } from "@/components/motion/Reveal";
import { MatchBar, ParallaxImage, Stagger, StaggerItem, WordReveal } from "@/components/result/Motion";
import { ResultActions, StickyCta } from "@/components/result/ResultActions";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { connectDB } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { maskEmail } from "@/lib/email";
import { getProduct, type ProductInfo } from "@/lib/kb";
import { Submission } from "@/models/assessment";
import { DISCLAIMER, HOW_TO_USE, SUPPORT, TIMELINE } from "@/kb/copy";

export const metadata: Metadata = { title: "Your report", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const LEVEL_LABEL = { high: "High match", moderate: "Moderate match", mild: "Mild match" } as const;

async function loadResult(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  await connectDB();
  return Submission.findOne({ tokenHash: sha256(token) }, { result: 1, product: 1, email: 1, email_status: 1, createdAt: 1 }).lean();
}

export default async function ResultPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const doc = await loadResult(token);
  if (!doc) notFound();

  const result = doc.result as AssessmentResult;
  // Live price/image from the latest fuyl.in sync (getProduct falls back safely).
  const product = await getProduct();
  const name = result.name;

  return (
    <>
      <SmoothScroll />
      <SiteHeader>
        <Link href="/" className="text-sm font-medium text-teal-deep underline-offset-4 hover:underline">
          Retake
        </Link>
      </SiteHeader>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 pt-10 sm:pt-16">
        {/* ── Hero ── */}
        <section className="text-center">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-teal-deep">Your FUYL wellness report</p>
          </Reveal>
          <WordReveal
            text={name ? `Made for ${name}` : "Made for you"}
            accent={name ?? "you"}
            className="mt-5 text-balance font-display text-5xl leading-[1.05] text-forest sm:text-7xl"
          />
          <Reveal delay={0.5}>
            <ul className="mt-8 flex flex-wrap justify-center gap-2">
              {[
                { icon: Sparkles, label: "Personalised to your answers" },
                { icon: ShieldCheck, label: "Safety-screened" },
                { icon: Leaf, label: "60 ingredients reviewed" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs text-forest">
                  <Icon className="h-3.5 w-3.5 text-teal" aria-hidden /> {label}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.6} className="mt-5">
            <ResultActions />
          </Reveal>
        </section>

        {/* ── Safety (shown first when it matters) ── */}
        {result.safety.notes.length > 0 && (
          <Reveal className="mt-14">
            <SafetyCard level={result.safety.level} notes={result.safety.notes} />
          </Reveal>
        )}

        {/* ── Focus areas ── */}
        <section className="mt-16" aria-labelledby="areas-heading">
          <Reveal>
            <h2 id="areas-heading" className="text-center font-display text-3xl text-forest sm:text-4xl">
              Your top focus areas
            </h2>
            <p className="mx-auto mt-3 max-w-md text-center text-[15px] text-muted">
              Based on your answers — and the COMPLETE+ ingredients that support each one.
            </p>
          </Reveal>
          <div className="mt-10 space-y-6">
            {result.areas.map((area, i) => (
              <Reveal key={area.key} delay={0.05}>
                <AreaCard area={area} index={i} />
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Product ── */}
        <section className="mt-20" aria-labelledby="product-heading">
          {result.showProduct ? (
            <ProductCard product={product} result={result} token={token} />
          ) : (
            <Reveal className="glass-strong rounded-[var(--radius-glass)] p-8 text-center sm:p-12">
              <h2 id="product-heading" className="font-display text-3xl text-forest">Please speak to your doctor first</h2>
              <p className="mx-auto mt-4 max-w-md text-[15px] text-muted">
                Based on your answers we can&rsquo;t recommend COMPLETE+ right now. Your doctor can advise on the right nutrition for you.
              </p>
            </Reveal>
          )}
        </section>

        {/* ── How to start ── */}
        {result.showProduct && (
          <section className="mt-20" aria-labelledby="start-heading">
            <Reveal>
              <h2 id="start-heading" className="text-center font-display text-3xl text-forest sm:text-4xl">
                How to start
              </h2>
            </Reveal>
            <Stagger className="mt-8 grid gap-4 sm:grid-cols-3">
              {HOW_TO_USE.map((s, i) => (
                <StaggerItem key={s.title} className="glass rounded-3xl p-6">
                  <span className="font-display text-3xl text-teal">0{i + 1}</span>
                  <p className="mt-3 font-medium text-forest">{s.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
                </StaggerItem>
              ))}
            </Stagger>
            <Reveal className="glass mt-4 rounded-3xl p-6 sm:p-8">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-deep">What to expect</p>
              <ol className="mt-5 space-y-4">
                {TIMELINE.map((t) => (
                  <li key={t.when} className="flex gap-4">
                    <span className="w-20 shrink-0 text-sm font-medium text-forest">{t.when}</span>
                    <span className="text-sm leading-relaxed text-muted">{t.body}</span>
                  </li>
                ))}
              </ol>
            </Reveal>
          </section>
        )}

        {/* ── Profile summary ── */}
        <section className="mt-20" aria-labelledby="profile-heading">
          <Reveal>
            <details className="glass group rounded-3xl p-6 sm:p-8">
              <summary className="flex cursor-pointer list-none items-center justify-between">
                <h2 id="profile-heading" className="font-display text-2xl text-forest">
                  Your answers
                </h2>
                <span className="text-sm text-teal-deep group-open:hidden">Show</span>
                <span className="hidden text-sm text-teal-deep group-open:inline">Hide</span>
              </summary>
              <ul className="mt-5 space-y-2 text-[15px] leading-relaxed text-muted">
                {result.summary.map((l) => (
                  <li key={l.questionKey}>{l.text}</li>
                ))}
              </ul>
            </details>
          </Reveal>
        </section>

        {/* ── Support ── */}
        <Reveal className="mt-8">
          <section aria-labelledby="support-heading" className="glass flex flex-col gap-4 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 id="support-heading" className="font-display text-2xl text-forest">
                Questions about COMPLETE+?
              </h2>
              <p className="mt-1 text-sm text-muted">The FUYL team is happy to help with ingredients, usage or your order.</p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <a href={SUPPORT.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full bg-forest px-4 text-sm font-medium text-white">
                <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
              </a>
              <a href={`mailto:${SUPPORT.email}`} className="glass inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm text-forest">
                <Mail className="h-4 w-4 text-teal-deep" aria-hidden /> {SUPPORT.email}
              </a>
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-12 text-center">
          <p className="text-sm text-muted">
            {doc.email_status === "sent"
              ? `A copy of this report has been sent to ${maskEmail(doc.email)}.`
              : "We couldn’t email you a copy this time — bookmark this page to come back to your report."}
          </p>
          <p className="mx-auto mt-8 max-w-xl text-xs leading-relaxed text-muted">{DISCLAIMER}</p>
        </Reveal>
      </main>
      {result.showProduct && <StickyCta href={`/go/${token}`} priceFrom={product.priceFrom} />}
    </>
  );
}

function AreaCard({ area, index }: { area: ResultArea; index: number }) {
  return (
    <article className="glass-strong rounded-[var(--radius-glass)] p-6 sm:p-9">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs tabular-nums text-muted">0{index + 1}</p>
          <h3 className="mt-1 font-display text-3xl text-forest">{area.name}</h3>
        </div>
        <span className="mt-1 shrink-0 rounded-full bg-sage px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-forest">
          {LEVEL_LABEL[area.level]}
        </span>
      </div>
      <div className="mt-4">
        <MatchBar value={area.match} label={`${area.name} match`} />
      </div>
      <p className="mt-5 text-[15px] leading-relaxed text-muted">{area.copy}</p>

      {(area.reasons.length > 0 || area.isPriority) && (
        <div className="mt-6 rounded-2xl bg-white/50 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-deep">Why this matters for you</p>
          <ul className="mt-3 space-y-2">
            {area.isPriority && (
              <li className="flex gap-2 text-sm text-forest">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden /> You chose this as a top priority
              </li>
            )}
            {area.reasons.map((r) => (
              <li key={r} className="flex gap-2 text-sm text-forest">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden /> {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-7 text-xs font-medium uppercase tracking-[0.2em] text-teal-deep">COMPLETE+ ingredients for you</p>
      <Stagger className="mt-4 grid gap-3 sm:grid-cols-2">
        {area.ingredients.map((ing) => (
          <StaggerItem key={ing.key} className="flex gap-3 rounded-2xl bg-white/60 p-4">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-sage/60">
              {ing.image ? (
                <Image src={ing.image} alt="" fill sizes="48px" className="object-cover" />
              ) : (
                <Leaf className="absolute inset-0 m-auto h-5 w-5 text-teal" aria-hidden />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-forest">{ing.name}</p>
              {ing.sharedWith && (
                <span className="mt-1 inline-block whitespace-nowrap rounded-full bg-sage/70 px-2 py-0.5 text-[10px] text-muted">
                  Also in {ing.sharedWith}
                </span>
              )}
              <p className="text-xs text-teal-deep">
                {ing.dose ? `${ing.dose}${ing.rda ? ` · ${ing.rda}% RDA` : ""}` : ing.blendDose ? `In ${ing.blend} · ${ing.blendDose}` : ing.blend}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{ing.why}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      {area.tips.length > 0 && (
        <div className="mt-6 border-t border-line/50 pt-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-deep">Simple habits that help</p>
          <ul className="mt-3 space-y-1.5">
            {area.tips.map((t) => (
              <li key={t} className="text-sm text-muted">
                — {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function SafetyCard({ level, notes }: { level: AssessmentResult["safety"]["level"]; notes: SafetyNote[] }) {
  const serious = level === "consult" || level === "stop";
  return (
    <div className={`rounded-[var(--radius-glass)] border p-6 sm:p-8 ${serious ? "border-ember/30 bg-[#fff6ee]/80" : "glass"}`}>
      <div className="flex items-center gap-2">
        {serious ? <AlertTriangle className="h-5 w-5 text-ember-deep" aria-hidden /> : <Info className="h-5 w-5 text-teal" aria-hidden />}
        <h2 className="font-display text-2xl text-forest">{serious ? "Before you start" : "Good to know"}</h2>
      </div>
      <ul className="mt-4 space-y-4">
        {notes.map((n) => (
          <li key={n.key}>
            <p className="text-sm font-medium text-forest">{n.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{n.message}</p>
            {n.ingredients.length > 0 && <p className="mt-1.5 text-xs text-ember-deep">Relevant ingredients: {n.ingredients.join(", ")}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductCard({ product, result, token }: { product: ProductInfo; result: AssessmentResult; token: string }) {
  const covered = result.coverage;
  return (
    <Reveal id="product-card" className="glass-strong overflow-hidden rounded-[var(--radius-glass)]">
      <div className="grid items-center gap-8 p-6 sm:p-10 md:grid-cols-[1fr_1.1fr]">
        {product.image ? (
          <ParallaxImage src={product.image} alt={product.title} />
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-3xl bg-gradient-to-br from-sage/70 to-cream">
            <Leaf className="h-12 w-12 text-teal" aria-hidden />
          </div>
        )}
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-teal-deep">Your match</p>
          <h2 id="product-heading" className="mt-3 font-display text-4xl leading-tight text-forest sm:text-5xl">
            {product.title}
          </h2>
          {product.description && <p className="mt-3 text-sm text-muted">{product.description}</p>}
          <p className="mt-6 text-[15px] leading-relaxed text-forest">
            Supports {covered.areaCount === 1 ? "your focus area" : `all ${covered.areaCount} of your focus areas`} with{" "}
            <strong>{covered.ingredientCount} targeted ingredients</strong> — plus a complete daily base of greens, berries, vitamins and minerals.
          </p>
          <p className="mt-6 text-sm text-muted">
            From <span className="text-2xl font-medium text-forest">₹{product.priceFrom.toLocaleString("en-IN")}</span>
          </p>
          <a
            href={`/go/${token}`}
            className="mt-6 inline-flex h-14 items-center gap-2 rounded-full bg-forest px-8 text-[15px] font-medium text-white shadow-[0_12px_30px_-12px_rgba(18,41,31,0.6)] transition hover:-translate-y-0.5 hover:bg-forest-soft"
          >
            View COMPLETE+ on fuyl.in <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
          {result.safety.level === "consult" && (
            <p className="mt-4 text-xs text-ember-deep">Please check with your doctor before starting — see the note above.</p>
          )}
        </div>
      </div>
    </Reveal>
  );
}
