import Link from "next/link";
import { CheckCircle2, CircleAlert, TriangleAlert } from "lucide-react";
import { checkKnowledgeBase, type KnowledgeBase } from "@/engine";
import { ActionButton } from "@/components/admin/ActionButton";
import { PublishPanel, ApprovePending } from "@/components/admin/ReviewControls";
import { Badge, Card, Empty, PageHeader, fmtDate } from "@/components/admin/ui";
import { restoreVersionAction } from "@/app/admin/actions";
import { requireAdminPage } from "@/lib/admin/auth";
import { getDraft, getLatestVersion, listVersions } from "@/lib/admin/kbStore";
import { diffKnowledgeBases, reviewCounts } from "@/kb/draft";
import { ENTITY_LABEL, type EntityType } from "@/kb/schema";

export const dynamic = "force-dynamic";

const href = (type: string, key: string) => (type === "settings" ? "/admin/settings" : `/admin/content/${type}/${key}`);

export default async function ReviewPage() {
  const admin = await requireAdminPage();
  const [draft, live, versions] = await Promise.all([getDraft(), getLatestVersion(), listVersions()]);
  const issues = checkKnowledgeBase(draft.kb);
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const { pending, total, approved } = reviewCounts(draft.kb, draft.reviews);
  const diff = live ? diffKnowledgeBases(live.kb as KnowledgeBase, draft.kb) : null;
  const canPublish = errors.length === 0 && pending.length === 0 && (diff === null || diff.length > 0);

  return (
    <>
      <PageHeader
        title="Review & publish"
        description="Everything users see comes from the latest published version. Edits go to the draft, need a reviewer's approval, then an admin publishes."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="1 · Checks" className="lg:col-span-1">
          {errors.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-forest">
              <CheckCircle2 className="h-4 w-4 text-teal" aria-hidden /> No errors
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-[#a3301e]">
              <CircleAlert className="h-4 w-4" aria-hidden /> {errors.length} error(s) block publishing
            </p>
          )}
          {warnings.length > 0 && (
            <p className="mt-1 flex items-center gap-2 text-sm text-[#9a5a1c]">
              <TriangleAlert className="h-4 w-4" aria-hidden /> {warnings.length} warning(s)
            </p>
          )}
          <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto text-xs">
            {[...errors, ...warnings].map((i, n) => (
              <li key={n} className={i.severity === "error" ? "text-[#a3301e]" : "text-[#9a5a1c]"}>
                {i.message}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">
            Checks cover broken references, unknown ingredients, unreachable questions and focus areas, and conditions that depend on later questions.
          </p>
        </Card>

        <Card title={`2 · Approvals (${approved}/${total})`} className="lg:col-span-2">
          {pending.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-forest">
              <CheckCircle2 className="h-4 w-4 text-teal" aria-hidden /> Everything is approved
            </p>
          ) : (
            <>
              <ApprovePending items={pending} />
              <ul className="mt-4 grid max-h-72 gap-1 overflow-y-auto text-sm sm:grid-cols-2">
                {pending.map((p) => (
                  <li key={`${p.type}:${p.key}`}>
                    <Link href={href(p.type, p.key)} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-cream">
                      <Badge>{ENTITY_LABEL[p.type as EntityType]}</Badge> <span className="truncate font-mono text-xs text-forest">{p.key}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <Card title={`3 · Changes since ${live ? `v${live.version}` : "launch"}`} className="mt-6">
        {diff === null ? (
          <p className="text-sm text-muted">Nothing has been published yet — the first publish makes the whole draft live.</p>
        ) : diff.length === 0 ? (
          <Empty>The draft matches the live version.</Empty>
        ) : (
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {diff.map((d) => (
              <li key={`${d.type}:${d.key}`}>
                <Link href={href(d.type, d.key)} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-cream">
                  <Badge tone={d.change === "added" ? "good" : d.change === "removed" ? "bad" : "info"}>{d.change}</Badge>
                  <span className="text-xs text-muted">{d.type === "settings" ? "Settings" : ENTITY_LABEL[d.type]}</span>
                  <span className="truncate font-mono text-xs text-forest">{d.key}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 border-t border-line/50 pt-5">
          {admin.role === "admin" ? (
            <PublishPanel canPublish={canPublish} nextVersion={(live?.version ?? 0) + 1} />
          ) : (
            <p className="text-sm text-muted">An admin publishes once everything is approved.</p>
          )}
        </div>
      </Card>

      <Card title="Version history" className="mt-6">
        {versions.length === 0 ? (
          <Empty>No versions yet.</Empty>
        ) : (
          <ul className="divide-y divide-line/50">
            {versions.map((v) => (
              <li key={v.version} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="font-semibold text-forest">v{v.version}</span>
                  {v.version === live?.version && (
                    <span className="ml-2">
                      <Badge tone="good">Live</Badge>
                    </span>
                  )}
                  <span className="ml-3 text-muted">
                    {fmtDate(v.publishedAt)} · {v.publishedBy}
                  </span>
                  {v.note && <span className="block text-xs text-muted">{v.note}</span>}
                </span>
                {admin.role === "admin" && (
                  <ActionButton
                    size="sm"
                    label="Restore to draft"
                    confirmText={`Replace the current draft with v${v.version}? Unpublished draft changes will be lost.`}
                    action={restoreVersionAction.bind(null, v.version)}
                    successText={`Draft now matches v${v.version}. Review and publish to roll back.`}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
