'use client'

import { FormEvent, useEffect, useState, useTransition } from 'react'
import { CheckCircle2, Sparkles, X } from 'lucide-react'
import { submitPrebookingLead } from '@/lib/api/content'
import { getErrorMessage } from '@/lib/api/client'

const SUBMITTED_KEY = 'fuyl_prebooking_submitted'
const DISMISSED_KEY = 'fuyl_prebooking_dismissed'

export function PrebookingPopup() {
  const [open, setOpen] = useState(false)
  const [available, setAvailable] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (localStorage.getItem(SUBMITTED_KEY) === '1') return
    setAvailable(true)
    const dismissed = sessionStorage.getItem(DISMISSED_KEY) === '1'
    if (!dismissed) {
      const timer = window.setTimeout(() => setOpen(true), 900)
      return () => window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss() }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous }
  }, [open])

  const dismiss = () => {
    setOpen(false)
    sessionStorage.setItem(DISMISSED_KEY, '1')
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const data = new FormData(event.currentTarget)
    startTransition(async () => {
      try {
        await submitPrebookingLead({
          name: String(data.get('name') ?? '').trim(),
          email: String(data.get('email') ?? '').trim(),
          phone: String(data.get('phone') ?? '').trim(),
          source: 'storefront_popup',
        })
        localStorage.setItem(SUBMITTED_KEY, '1')
        sessionStorage.removeItem(DISMISSED_KEY)
        setSuccess(true)
        window.setTimeout(() => { setOpen(false); setAvailable(false) }, 2800)
      } catch (err) {
        setError(getErrorMessage(err, 'Could not save your details. Please try again.'))
      }
    })
  }

  if (!available) return null

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-4 sm:right-6 z-50 flex items-center gap-2 rounded-full bg-brand-forest px-4 py-3 text-sm font-semibold text-white shadow-xl animate-bounce hover:bg-brand-teal transition-colors"
          aria-label="Open pre-booking form"
        >
          <Sparkles size={16} /> Pre-book now
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-forest/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="prebooking-title" onMouseDown={(e) => { if (e.target === e.currentTarget) dismiss() }}>
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <button type="button" onClick={dismiss} className="absolute right-4 top-4 rounded-full p-2 text-brand-muted hover:bg-brand-sage/60 hover:text-brand-forest" aria-label="Close pre-booking form"><X size={18} /></button>
            {success ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto mb-4 text-brand-teal" size={48} />
                <h2 id="prebooking-title" className="font-display text-3xl text-brand-forest">YOU&apos;RE ON THE LIST!</h2>
                <p className="mt-3 text-sm text-brand-muted">We&apos;ve emailed your confirmation. You&apos;ll be among the first to know when pre-booking opens.</p>
              </div>
            ) : (
              <>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-teal">Launching soon</span>
                <h2 id="prebooking-title" className="mt-3 pr-8 font-display text-3xl text-brand-forest">BE FIRST IN LINE</h2>
                <p className="mt-3 text-sm leading-6 text-brand-muted">Join the FUYL pre-booking list for early access and launch updates.</p>
                <form onSubmit={submit} className="mt-6 space-y-4">
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-brand-forest">Name</span><input name="name" required minLength={2} maxLength={120} autoComplete="name" className="w-full rounded-lg border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20" /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-brand-forest">Email</span><input name="email" type="email" required maxLength={200} autoComplete="email" className="w-full rounded-lg border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20" /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-brand-forest">Phone</span><input name="phone" type="tel" required minLength={7} maxLength={24} autoComplete="tel" className="w-full rounded-lg border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20" /></label>
                  {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{error}</p>}
                  <button type="submit" disabled={pending} className="w-full rounded-lg bg-brand-forest px-5 py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-brand-teal disabled:opacity-60">{pending ? 'Joining…' : 'Join pre-booking list'}</button>
                </form>
                <p className="mt-4 text-center text-[11px] text-brand-muted">We&apos;ll only use your details for FUYL pre-booking updates.</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
