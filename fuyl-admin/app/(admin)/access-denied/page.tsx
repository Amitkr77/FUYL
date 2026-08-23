import { ShieldAlert } from 'lucide-react'

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto mt-16 max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-slate-900">No module access assigned</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Your staff account is active, but it has no module permissions. Ask an administrator to assign the access you need.
      </p>
    </div>
  )
}
