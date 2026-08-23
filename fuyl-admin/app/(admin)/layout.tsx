import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import AdminShell from '@/components/layout/AdminShell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const sessionInfo = {
    email:       session.email,
    role:        session.role,
    permissions: session.permissions ?? [],
  }

  return <AdminShell sessionInfo={sessionInfo}>{children}</AdminShell>
}
