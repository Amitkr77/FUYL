import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { requireAdminPage } from "@/lib/admin/auth";
import { getDraft } from "@/lib/admin/kbStore";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const admin = await requireAdminPage();
  const { kb } = await getDraft();
  return (
    <>
      <PageHeader title="Engine settings" description="How long the assessment can get and how results are shown. Saved to the draft; publish to apply." />
      <SettingsForm initial={kb.settings} canEdit={admin.role === "admin"} />
    </>
  );
}
