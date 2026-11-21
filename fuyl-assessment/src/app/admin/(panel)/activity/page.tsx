import { Card, Empty, PageHeader, fmtDate } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin/auth";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models/admin";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  await requireAdminPage();
  await connectDB();
  const rows = await AuditLog.find().sort({ at: -1 }).limit(200).lean();
  return (
    <>
      <PageHeader title="Activity log" description="Every sign-in, edit, approval, publish, export and deletion. Latest 200 entries." />
      <Card>
        {rows.length === 0 ? (
          <Empty>No activity yet.</Empty>
        ) : (
          <ul className="divide-y divide-line/50 text-sm">
            {rows.map((r) => (
              <li key={String(r._id)} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-forest">
                  <span className="font-medium">{r.actor ?? "system"}</span> · <span className="font-mono text-xs">{r.action}</span>
                  {r.target ? <span className="text-muted"> · {r.target}</span> : null}
                </span>
                <span className="text-xs text-muted">{fmtDate(r.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
