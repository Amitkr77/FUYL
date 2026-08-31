'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ContentError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="flex min-h-[420px] items-center justify-center">
    <div className="max-w-lg rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"><AlertCircle className="h-6 w-6" /></div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">Website content could not be loaded</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">Nothing has been replaced or saved. Check the backend connection and try loading the existing content again.</p>
      <button type="button" onClick={reset} className="mx-auto mt-5 flex items-center gap-2 rounded-lg bg-[#558476] px-4 py-2 text-sm font-medium text-white hover:bg-[#457366]"><RefreshCw className="h-4 w-4" />Try again</button>
    </div>
  </div>
}
