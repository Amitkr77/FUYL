import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Info, Leaf, Mail, Phone, ShieldCheck, Sparkles } from "lucide-react";
import type { AssessmentResult, ResultArea, SafetyNote } from "@/engine";
import { Reveal } from "@/components/motion/Reveal";
import { MatchBar, Stagger, StaggerItem, WordReveal } from "@/components/result/Motion";
import { FindingsCard, nutrientNote, type FindingStats } from "@/components/result/ReportSections";
import { ReportChapterBar, ReportSidebar, type Chapter } from "@/components/result/ReportNav";
import { FormulaBars } from "@/components/result/charts/FormulaBars";
import { NutrientExplorer } from "@/components/result/charts/NutrientExplorer";
import { ProfileRadar } from "@/components/result/charts/ProfileRadar";
import { WellnessScore } from "@/components/result/charts/WellnessScore";
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

/**
 * The report — a wide, personal dashboard. A sticky sidebar (desktop) or
 * chapter bar (phones) follows four chapters: Summary → Focus areas →
 * Nutrition → Safety & next steps. The aim is to inform: the product is
 * described once, calmly, at the end — never pushed along the way.
 */
export default async function ResultPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const doc = await loadResult(token);
  if (!doc) notFound();

  const result = doc.result as AssessmentResult;
  // Live price/image from the latest fuyl.in sync (getProduct falls back safely).
  const product = await getProduct();
  const name = result.name;
  const created = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(new Date(doc.createdAt as Date));
  const checks = result.safety.notes.filter((n) => n.level === "consult" || n.level === "caution");
  const stats: FindingStats = {
    areas: result.areas.length,
    ingredients: result.coverage.ingredientCount,
    nutrientsHalf: result.nutrients ? { count: result.nutrients.rows.filter((r) => (result.nutrients!.primary === "global" ? r.globalPct : r.indiaPct) >= 50).length, total: result.nutrients.rows.length, global: result.nutrients.primary === "global" } : undefined,
    safety: { level: result.safety.level, checks: checks.length },
  };
  const chapters: Chapter[] = [
    { id: "summary", label: "Summary" },
    ...(result.areas.length ? [{ id: "areas", label: "Your focus areas" }] : []),
    ...(result.showProduct && result.nutrients ? [{ id: "nutrition", label: "Your nutrition" }] : []),
    { id: "next", label: "Safety & next steps" },
  ];
  const pdfHref = `/result/${token}/pdf`;

  return (
    <>
      <SmoothScroll />
      <SiteHeader wide>
        <Link href="/" className="text-sm font-medium text-teal-deep underline-offset-4 hover:underline">
          Retake
        </Link>
      </SiteHeader>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-20 pt-4 sm:pt-8 lg:px-8">
        <ReportChapterBar chapters={chapters} pdfHref={pdfHref} />
        <div className="grid gap-8 lg:grid-cols-[272px_minmax(0,1fr)] xl:gap-10">
          <ReportSidebar
            name={name}
            date={created}
            topAreas={result.areas.slice(0, 4).map((a) => ({ name: a.name, match: a.match }))}
            wellness={result.wellness ? { score: result.wellness.score, label: result.wellness.label } : undefined}
            chapters={chapters}
            pdfHref={pdfHref}
          />

          <div className="min-w-0 space-y-20">
            {/* ── ① Summary ── */}
            <section id="summary" aria-labelledby="summary-heading" className="scroll-mt-24">
              <Reveal>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-teal-deep">Your FUYL wellness report · {created}</p>
              </Reveal>
              <WordReveal
                text={name ? `Made for ${name}` : "Made for you"}
                accent={name ?? "you"}
                className="mt-3 text-balance font-display text-4xl leading-[1.05] text-forest sm:text-6xl"
              />
              <h2 id="summary-heading" className="sr-only">
                Summary
              </h2>

              {checks.length > 0 && (
                <Reveal className="mt-6">
                  <a href="#next" className="flex items-start gap-3 rounded-2xl border border-ember/30 bg-[#fff6ee]/90 p-4 text-sm text-forest hover:bg-[#fff1e4]">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-ember-deep" aria-hidden />
                    <span>
                      <strong className="font-medium">Before you start anything new:</strong> {checks.length === 1 ? "one thing" : `${checks.length} things`} to check with your
                      doctor. <span className="text-teal-deep underline underline-offset-4">See the safety notes</span>
                    </span>
                  </a>
                </Reveal>
              )}

              {result.wellness && (
                <Reveal className="mt-6">
                  <WellnessScore wellness={result.wellness} />
                </Reveal>
              )}

              {/* Bento: findings + profile */}
              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                {result.findings && (
                  <Reveal>
                    <FindingsCard findings={result.findings} stats={result.showProduct ? stats : undefined} />
                  </Reveal>
                )}
                {result.showProduct && result.profile && (
                  <Reveal delay={0.05}>
                    <ProfileRadar profile={result.profile} compact />
                  </Reveal>
                )}
              </div>
            </section>

            {/* ── ② Focus areas ── */}
            {result.areas.length > 0 && (
              <section id="areas" aria-labelledby="areas-heading" className="scroll-mt-24">
                <ChapterHeading n={2} id="areas-heading" title="Your focus areas" />
                <p className="mt-3 flex max-w-3xl items-start gap-2 text-sm leading-relaxed text-muted">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" aria-hidden />
                  <span>
                    <strong className="font-medium text-forest">What does &ldquo;match&rdquo; mean?</strong> How strongly your answers point to an area, compared with the
                    strongest possible answers. It isn&rsquo;t a health score or a diagnosis.
                  </span>
                </p>
                <div className="mt-8 space-y-6">
                  {result.areas.map((area, i) => (
                    <Reveal key={area.key} delay={0.05}>
                      <AreaCard area={area} index={i} nutrients={result.nutrients?.rows} />
                    </Reveal>
                  ))}
                </div>
              </section>
            )}

            {/* ── ③ Nutrition ── */}
            {result.showProduct && result.nutrients && (
              <section id="nutrition" aria-labelledby="nutrition-chapter" className="scroll-mt-24">
                <ChapterHeading n={3} id="nutrition-chapter" title="Your nutrition" />
                <Reveal className="mt-8">
                  <NutrientExplorer nutrients={result.nutrients} />
                </Reveal>
              </section>
            )}

            {/* ── ④ Safety & next steps ── */}
            <section id="next" aria-labelledby="next-heading" className="scroll-mt-24">
              <ChapterHeading n={chapters.length} id="next-heading" title="Safety & next steps" />

              <div className="mt-8 grid items-start gap-6 xl:grid-cols-2">
                <Reveal className="h-full">
                  {result.safety.notes.length > 0 ? (
                    <SafetyCard level={result.safety.level} notes={result.safety.notes} />
                  ) : (
                    <div className="glass flex h-full items-start gap-3 rounded-[var(--radius-glass)] p-6 sm:p-8">
                      <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-teal-deep" aria-hidden />
                      <div>
                        <h3 className="font-display text-xl text-forest">No safety concerns</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted">
                          Nothing in your answers suggests you should avoid any ingredient. If your health or medicines change, take the assessment again.
                        </p>
                      </div>
                    </div>
                  )}
                </Reveal>

                <Reveal className="h-full" delay={0.05}>
                  {result.showProduct ? (
                    <ProductCard product={product} result={result} token={token} />
                  ) : (
                    <div className="glass-strong h-full rounded-[var(--radius-glass)] p-6 sm:p-8">
                      <h3 id="product-heading" className="font-display text-2xl text-forest">
                        Please speak to your doctor first
                      </h3>
                      <p className="mt-3 text-[15px] leading-relaxed text-muted">
                        Based on your answers we can&rsquo;t recommend COMPLETE+ right now. Your doctor can advise on the right nutrition for you.
                      </p>
                    </div>
                  )}
                </Reveal>
              </div>

              {result.showProduct && result.blends && (
                <Reveal className="mt-6">
                  <details className="group">
                    <summary className="glass flex cursor-pointer list-none items-center justify-between gap-4 rounded-[var(--radius-glass)] px-6 py-4">
                      <span className="font-medium text-forest">What&rsquo;s in one serve, blend by blend</span>
                      <span className="text-sm text-teal-deep group-open:hidden">Show</span>
                      <span className="hidden text-sm text-teal-deep group-open:inline">Hide</span>
                    </summary>
                    <div className="mt-4">
                      <FormulaBars blends={result.blends} />
                    </div>
                  </details>
                </Reveal>
              )}

              {/* Your answers */}
              <Reveal className="mt-6">
                <details className="group glass rounded-[var(--radius-glass)] p-6 sm:p-8">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <h3 id="profile-heading" className="font-display text-xl text-forest">
                      Your answers
                    </h3>
                    <span className="text-sm text-teal-deep group-open:hidden">Show</span>
                    <span className="hidden text-sm text-teal-deep group-open:inline">Hide</span>
                  </summary>
                  <ul className="mt-5 grid gap-x-8 gap-y-2 text-[15px] leading-relaxed text-muted md:grid-cols-2">
                    {result.summary.map((l) => (
                      <li key={l.questionKey}>{l.text}</li>
                    ))}
                  </ul>
                </details>
              </Reveal>

              <Reveal className="mt-6">
                <SupportCard />
              </Reveal>

              <Reveal className="mt-10 text-center">
                <p className="text-sm text-muted">
                  {doc.email_status === "sent"
                    ? `A copy of this report has been sent to ${maskEmail(doc.email)}.`
                    : "We couldn’t email you a copy this time — bookmark this page or download the PDF to keep your report."}
                </p>
                <p className="mx-auto mt-6 max-w-2xl text-xs leading-relaxed text-muted">{DISCLAIMER}</p>
              </Reveal>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

function ChapterHeading({ n, id, title }: { n: number; id: string; title: string }) {
  return (
    <Reveal className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest text-sm font-semibold text-white" aria-hidden>
        {n}
      </span>
      <h2 id={id} className="font-display text-3xl text-forest sm:text-4xl">
        {title}
      </h2>
    </Reveal>
  );
}

function AreaCard({ area, index, nutrients }: { area: ResultArea; index: number; nutrients?: NonNullable<AssessmentResult["nutrients"]>["rows"] }) {
  return (
    <article className="glass-strong grid gap-8 rounded-[var(--radius-glass)] p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      {/* Left: what and why */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs tabular-nums text-muted">0{index + 1}</p>
            <h3 className="mt-1 font-display text-3xl text-forest">{area.name}</h3>
          </div>
          <span className="mt-1 shrink-0 rounded-full bg-sage px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-forest">{LEVEL_LABEL[area.level]}</span>
        </div>
        <div className="mt-4">
          <MatchBar value={area.match} label={`${area.name} match`} />
        </div>
        <p className="mt-5 text-[15px] leading-relaxed text-muted">{area.copy}</p>

        {(area.reasons.length > 0 || area.isPriority) && (
          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-deep">Why this matters for you</p>
            <ul className="mt-3 space-y-2">
              {area.isPriority && (
                <li className="flex gap-2 text-sm text-forest">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" aria-hidden /> You chose this as a top priority
                </li>
              )}
              {area.reasons.map((r) => (
                <li key={r} className="flex gap-2 text-sm text-forest">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" aria-hidden /> {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {area.tips.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white/55 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-deep">Simple habits that help</p>
            <ul className="mt-3 space-y-1.5">
              {area.tips.map((t) => (
                <li key={t} className="flex gap-2 text-sm text-forest">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal-deep" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Right: the nutrients that support it */}
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-deep">Nutrients that support this</p>
        <Stagger className="mt-4 grid gap-3 sm:grid-cols-2">
          {area.ingredients.map((ing) => (
            <StaggerItem key={ing.key} className="flex gap-3 rounded-2xl bg-white/60 p-4">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-sage/60">
                {ing.image ? <Image src={ing.image} alt="" fill sizes="48px" className="object-cover" /> : <Leaf className="absolute inset-0 m-auto h-5 w-5 text-teal" aria-hidden />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-forest">{ing.name}</p>
                {ing.sharedWith && (
                  <span className="mt-1 inline-block whitespace-nowrap rounded-full bg-sage/70 px-2 py-0.5 text-[10px] text-muted">Also in {ing.sharedWith}</span>
                )}
                <p className="text-xs text-teal-deep">
                  {ing.dose
                    ? `${ing.dose} · ${nutrientNote(nutrients, ing.key) ?? (ing.rda ? `${ing.rda}% RDA` : "")}`.replace(/ · $/, "")
                    : ing.blendDose
                      ? `In ${ing.blend} · ${ing.blendDose}`
                      : ing.blend}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{ing.why}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </article>
  );
}

function SafetyCard({ level, notes }: { level: AssessmentResult["safety"]["level"]; notes: SafetyNote[] }) {
  const serious = level === "consult" || level === "stop";
  return (
    <div className={`h-full rounded-[var(--radius-glass)] border p-6 sm:p-8 ${serious ? "border-ember/30 bg-[#fff6ee]/80" : "glass"}`}>
      <div className="flex items-center gap-2">
        {serious ? <AlertTriangle className="h-5 w-5 text-ember-deep" aria-hidden /> : <Info className="h-5 w-5 text-teal" aria-hidden />}
        <h3 className="font-display text-2xl text-forest">{serious ? "Before you start" : "Good to know"}</h3>
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

/** One calm mention of the product, at the end — information to help decide, not a sales push. */
function ProductCard({ product, result, token }: { product: ProductInfo; result: AssessmentResult; token: string }) {
  return (
    <div id="product-card" className="glass-strong flex h-full flex-col rounded-[var(--radius-glass)] p-6 sm:p-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-deep">If you&rsquo;d like support</p>
      <div className="mt-4 flex items-start gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-sage/70 to-cream">
          {product.image ? <Image src={product.image} alt={product.title} fill sizes="80px" className="object-contain p-1.5" /> : <Leaf className="absolute inset-0 m-auto h-7 w-7 text-teal" aria-hidden />}
        </div>
        <div className="min-w-0">
          <h3 id="product-heading" className="font-display text-2xl leading-tight text-forest">
            {product.title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            One daily serve that brings together the {result.coverage.ingredientCount} nutrients and botanicals listed for your focus areas, plus a base of greens,
            berries, vitamins and minerals.
          </p>
        </div>
      </div>

      <details className="group mt-5 rounded-2xl bg-white/50 px-4 py-3">
        <summary className="cursor-pointer list-none text-sm font-medium text-teal-deep">
          <span className="group-open:hidden">How to take it &amp; what to expect</span>
          <span className="hidden group-open:inline">Hide</span>
        </summary>
        <ol className="mt-3 space-y-2 text-sm text-muted">
          {HOW_TO_USE.map((s, i) => (
            <li key={s.title}>
              <strong className="font-medium text-forest">
                {i + 1}. {s.title}
              </strong>{" "}
              — {s.body}
            </li>
          ))}
        </ol>
        <ul className="mt-3 space-y-1.5 border-t border-line/50 pt-3 text-sm text-muted">
          {TIMELINE.map((t) => (
            <li key={t.when}>
              <strong className="font-medium text-forest">{t.when}:</strong> {t.body}
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-5">
        <a href={`/go/${token}`} className="inline-flex h-11 items-center gap-2 rounded-full border border-forest/20 bg-white/80 px-5 text-sm font-medium text-forest transition hover:bg-white">
          View COMPLETE+ on fuyl.in <ArrowUpRight className="h-4 w-4" aria-hidden />
        </a>
        <span className="text-xs text-muted">From ₹{product.priceFrom.toLocaleString("en-IN")}</span>
      </div>
      {result.safety.level === "consult" && (
        <p className="mt-3 text-xs text-ember-deep">Please check with your doctor before starting — see the note above.</p>
      )}
    </div>
  );
}

/** WhatsApp's mark (no icon set ships brand logos). */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2Zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 4.54 0 8.24 3.7 8.24 8.24 0 4.55-3.7 8.24-8.24 8.24Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}

/** "Questions?" — icon-only contact buttons (each with a label for screen readers and a tooltip). */
function SupportCard() {
  const tel = `tel:${SUPPORT.phone.replace(/\s+/g, "")}`;
  const items = [
    { href: SUPPORT.whatsapp, label: "Chat on WhatsApp", icon: <WhatsAppIcon className="h-5 w-5" />, external: true, primary: true },
    { href: `mailto:${SUPPORT.email}`, label: `Email ${SUPPORT.email}`, icon: <Mail className="h-5 w-5" aria-hidden />, external: false, primary: false },
    { href: tel, label: `Call ${SUPPORT.phone}`, icon: <Phone className="h-5 w-5" aria-hidden />, external: false, primary: false },
  ];
  return (
    <section aria-labelledby="support-heading" className="glass relative overflow-hidden rounded-[var(--radius-glass)] p-6 sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sage/60 blur-2xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="support-heading" className="font-display text-2xl text-forest">
            Questions about your results?
          </h2>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-muted">Talk to the FUYL team about your report, ingredients or anything you&rsquo;re unsure of. We usually reply within a day.</p>
        </div>
        <ul className="flex gap-3 print:hidden" aria-label="Contact FUYL">
          {items.map((it) => (
            <li key={it.label}>
              <a
                href={it.href}
                {...(it.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                aria-label={it.label}
                title={it.label}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition hover:-translate-y-0.5 ${it.primary ? "bg-[#25d366] text-white shadow-[0_10px_24px_-12px_rgba(37,211,102,0.9)]" : "bg-white/85 text-forest shadow-[inset_0_0_0_1px_rgba(18,41,31,0.1)] hover:bg-white"}`}
              >
                {it.icon}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
