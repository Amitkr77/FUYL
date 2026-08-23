import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getStaffLandingPath } from '@/lib/access-control'

export default async function Home() {
  const session = await getSession()
  if (!session) redirect('/login')
  redirect(session.role === 'staff' ? getStaffLandingPath(session.permissions ?? []) : '/dashboard')
}
