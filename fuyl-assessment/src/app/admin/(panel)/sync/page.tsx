import Image from "next/image";
import { ActionButton } from "@/components/admin/ActionButton";
import { Badge, Card, Empty, PageHeader, fmtDate } from "@/components/admin/ui";
import { acknowledgeLabelsAction, syncNowAction } from "@/app/admin/actions";
import { requireAdminPage } from "@/lib/admin/auth";
import { connectDB } from "@/lib/db";
import { env } from "@/lib/env";
import { StoreIngredient, StoreProduct, SyncRun, SyncState } from "@/models/store";
import { LABEL_IMAGES } from "@/sync/labels";

export const dynamic = "force-dynamic";

export default async function SyncPage() {
  await requireAdminPage();
  await connectDB();
  const [state, runs, product, ingredientCount, unmatched] = await Promise.all([
    SyncState.findById("singleton").lean(),
    SyncRun.find().sort({ startedAt: -1 }).limit(15).lean(),
    StoreProduct.findOne({ handle: env().FUYL_PRODUCT_HANDLE }).lean(),
    StoreIngredient.countDocuments({ active: true }),
    StoreIngredient.find({ active: true, matchedKeys: { $size: 0 } }, { title: 1 }).lean(),
  ]);
  const acknowledged = new Map((state?.acknowledgedLabels ?? []).map((l) => [l.file, l.src]));

  return (
    <>
      <PageHeader
        title="fuyl.in sync"
        description="Product and ingredient data come from the live store. Runs daily; you can also run it now."
        actions={<ActionButton variant="primary" label="Sync now" pendingLabel="Syncing…" action={syncNowAction} successText="Sync {status}." />}
      />

      {state?.labelReviewNeeded && (
        <Card className="mb-6 border-[#f2c9c1] bg-[#fff6f3]">
          <p className="font-medium text-[#a3301e]">A COMPLETE+ label image changed on fuyl.in</p>
          <p className="mt-1 text-sm text-forest">
            Ingredient doses were transcribed from these images. Compare the current images below with the doses on the Ingredients page, update anything that changed, then confirm.
          </p>
          <div className="mt-4">
            <ActionButton
              variant="primary"
              label="I've checked the doses — mark as reviewed"
              confirmText="Confirm the ingredient doses match the current label images?"
              action={acknowledgeLabelsAction}
            />
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Product">
          {product ? (
            <div className="flex gap-4">
              {product.images?.[0]?.src && (
                <Image src={product.images[0].src} alt="" width={80} height={80} className="h-20 w-20 rounded-xl bg-cream object-contain" />
              )}
              <div className="text-sm">
                <p className="font-medium text-forest">{product.title}</p>
                <p className="text-muted">{(product.variants ?? []).map((v) => `${v.title} ₹${v.price}`).join(" · ")}</p>
                <a href={product.url} target="_blank" rel="noreferrer" className="text-xs text-teal-deep hover:underline">
                  {product.url}
                </a>
                <p className="mt-1 text-xs text-muted">Synced {fmtDate(product.syncedAt)}</p>
              </div>
            </div>
          ) : (
            <Empty>Not synced yet — run a sync.</Empty>
          )}
        </Card>

        <Card title="Ingredients page">
          <p className="text-sm text-forest">{ingredientCount} ingredient cards synced</p>
          <p className="mt-1 text-sm text-muted">
            Unmatched: {unmatched.length === 0 ? "none" : unmatched.map((u) => u.title).join(", ")}
          </p>
          {unmatched.length > 0 && <p className="mt-2 text-xs text-[#9a5a1c]">Unmatched cards have no ingredient in the knowledge base — add one, or rename an existing ingredient to match.</p>}
        </Card>
      </div>

      <Card title="Label images (watched for changes)" className="mt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {LABEL_IMAGES.map((l) => {
            const current = product?.images?.find((i) => i.file === l.file)?.src;
            const ok = current && acknowledged.get(l.file) === current;
            return (
              <div key={l.file} className="rounded-xl border border-line/60 p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-forest">{l.label}</span>
                  {!current ? <Badge tone="bad">Missing</Badge> : ok ? <Badge tone="good">Reviewed</Badge> : <Badge tone="warn">Changed</Badge>}
                </div>
                {current && (
                  <a href={current} target="_blank" rel="noreferrer">
                    <Image src={current} alt={l.label} width={600} height={600} className="w-full rounded-lg bg-cream" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Recent runs" className="mt-6">
        {runs.length === 0 ? (
          <Empty>No runs yet.</Empty>
        ) : (
          <ul className="divide-y divide-line/50 text-sm">
            {runs.map((r) => (
              <li key={String(r._id)} className="flex flex-wrap items-center gap-3 py-2">
                <Badge tone={r.status === "success" ? "good" : r.status === "partial" ? "warn" : "bad"}>{r.status}</Badge>
                <span className="text-muted">{fmtDate(r.startedAt)}</span>
                <span className="text-xs text-muted">{r.trigger}</span>
                <span className="text-xs text-forest">
                  product {r.product?.ok ? "✓" : "✗"} · ingredients {r.ingredients?.ok ? `✓ ${r.ingredients.count}` : "✗"}
                </span>
                {(r.product?.error || r.ingredients?.error) && <span className="w-full text-xs text-[#a3301e]">{r.product?.error ?? r.ingredients?.error}</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
