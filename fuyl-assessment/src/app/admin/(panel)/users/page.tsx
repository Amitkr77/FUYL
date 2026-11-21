import { PageHeader } from "@/components/admin/ui";
import { UsersManager } from "@/components/admin/UsersManager";
import { requireAdminPage } from "@/lib/admin/auth";
import { connectDB } from "@/lib/db";
import { AdminUser } from "@/models/admin";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const admin = await requireAdminPage(["admin"]);
  await connectDB();
  const users = await AdminUser.find({}, { email: 1, name: 1, role: 1, active: 1, lastLoginAt: 1 }).sort({ createdAt: 1 }).lean();
  return (
    <>
      <PageHeader title="Users" description="Admins can do everything. Reviewers can edit and approve content, run the simulator and view submissions — but can't publish, delete or export." />
      <UsersManager
        meId={admin.id}
        users={users.map((u) => ({ id: String(u._id), email: u.email, name: u.name, role: u.role as "admin" | "reviewer", active: u.active ?? true, lastLoginAt: u.lastLoginAt?.toISOString() }))}
      />
    </>
  );
}
