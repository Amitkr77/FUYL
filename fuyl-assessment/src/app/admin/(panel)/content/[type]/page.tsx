import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { BLOCK_ORDER, type KnowledgeBase } from "@/engine";
import { Badge, Card, PageHeader, btn } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin/auth";
import { getDraft } from "@/lib/admin/kbStore";
import { reviewKey, type Reviews } from "@/kb/draft";
import { ENTITY_TYPES, type EntityType } from "@/kb/schema";

export const dynamic = "force-dynamic";

const TITLES: Record<EntityType, { title: string; description: string }> = {
  question: { title: "Questions", description: "The adaptive question graph, in the order users see it. Follow-ups only appear when their condition is met." },
  area: { title: "Focus areas", description: "What the result is built around — each links to the COMPLETE+ ingredients that support it." },
  ingredient: { title: "Ingredients", description: "All COMPLETE+ ingredients with label doses. Images sync from fuyl.in; names, doses and wording are edited here." },
  safety: { title: "Safety rules", description: "Checked on every result. Stop = no product shown; consult = product shown with a doctor note." },
};

const BLOCK_LABEL = { about: "A · About you", lifestyle: "B · Lifestyle", feel: "C · How you feel", safety: "D · Safety" } as const;

function ReviewBadge({ reviews, type, k }: { reviews: Reviews; type: EntityType; k: string }) {
  const r = reviews[reviewKey(type, k)];
  return r?.status === "approved" ? <Badge tone="good">Approved</Badge> : <Badge tone="warn">Needs review</Badge>;
}

export default async function ContentList({ params }: { params: Promise<{ type: string }> }) {
  const admin = await requireAdminPage();
  const { type } = await params;
  if (!(ENTITY_TYPES as readonly string[]).includes(type)) notFound();
  const t = type as EntityType;
  const { kb, reviews } = await getDraft();
  const meta = TITLES[t];

  return (
    <>
      <PageHeader
        title={meta.title}
        description={meta.description}
        actions={
          <Link href={`/admin/content/${t}/new`} className={btn("primary")}>
            <Plus className="h-4 w-4" aria-hidden /> New
          </Link>
        }
      />
      {t === "question" ? <QuestionList kb={kb} reviews={reviews} /> : <FlatList kb={kb} reviews={reviews} type={t} />}
      <p className="mt-6 text-xs text-muted">
        Changes are saved to the draft and need approval{admin.role === "admin" ? " and publishing" : " — an admin then publishes"} before users see them.
      </p>
    </>
  );
}

function QuestionList({ kb, reviews }: { kb: KnowledgeBase; reviews: Reviews }) {
  return (
    <div className="space-y-6">
      {BLOCK_ORDER.map((block) => {
        const qs = kb.questions.filter((q) => q.block === block).sort((a, b) => a.order - b.order);
        return (
          <Card key={block} title={`${BLOCK_LABEL[block]} · ${qs.length}`}>
            <ul className="divide-y divide-line/50">
              {qs.map((q) => (
                <li key={q.key}>
                  <Link href={`/admin/content/question/${q.key}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 hover:bg-cream/40">
                    <span className="w-8 text-xs tabular-nums text-muted">{q.order}</span>
                    <span className="min-w-0 flex-1 text-sm text-forest">
                      {q.prompt}
                      <span className="ml-2 font-mono text-[11px] text-muted">{q.key}</span>
                    </span>
                    <Badge tone="info">{q.type}</Badge>
                    {q.tier === "followup" && <Badge>follow-up</Badge>}
                    {q.showIf && <Badge>conditional</Badge>}
                    <ReviewBadge reviews={reviews} type="question" k={q.key} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

function FlatList({ kb, reviews, type }: { kb: KnowledgeBase; reviews: Reviews; type: Exclude<EntityType, "question"> }) {
  const rows =
    type === "area"
      ? [...kb.areas].sort((a, b) => a.order - b.order).map((a) => ({ key: a.key, title: a.name, meta: `${a.ingredients.length} ingredients · ${a.tips.length} tips`, extra: null }))
      : type === "ingredient"
        ? kb.ingredients.map((i) => ({ key: i.key, title: i.name, meta: i.blend ?? "", extra: i.dose ? `${i.dose}${i.rda ? ` · ${i.rda}% RDA` : ""}` : i.blendDose ? `blend ${i.blendDose}` : "" }))
        : kb.safetyRules.map((r) => ({ key: r.key, title: r.title, meta: `${r.ingredientKeys.length} ingredients named`, extra: r.level }));

  return (
    <Card>
      <ul className="divide-y divide-line/50">
        {rows.map((r) => (
          <li key={r.key}>
            <Link href={`/admin/content/${type}/${r.key}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 hover:bg-cream/40">
              <span className="min-w-0 flex-1 text-sm text-forest">
                {r.title}
                <span className="ml-2 font-mono text-[11px] text-muted">{r.key}</span>
                {r.meta && <span className="block text-xs text-muted">{r.meta}</span>}
              </span>
              {r.extra &&
                (type === "safety" ? (
                  <Badge tone={r.extra === "stop" ? "bad" : r.extra === "consult" ? "warn" : "info"}>{r.extra}</Badge>
                ) : (
                  <span className="text-xs tabular-nums text-teal-deep">{r.extra}</span>
                ))}
              <ReviewBadge reviews={reviews} type={type} k={r.key} />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
