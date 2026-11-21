import { PageHeader } from "@/components/admin/ui";
import { Simulator } from "@/components/admin/Simulator";
import { requireAdminPage } from "@/lib/admin/auth";
import { getDraft } from "@/lib/admin/kbStore";

export const dynamic = "force-dynamic";

export default async function SimulatorPage() {
  await requireAdminPage();
  const { kb } = await getDraft();
  return (
    <>
      <PageHeader
        title="Flow simulator"
        description="Take the assessment against the current DRAFT with the engine's workings visible. Option tiles show their scores and safety flags. Nothing is saved."
      />
      <Simulator kb={kb} />
    </>
  );
}
