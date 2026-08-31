'use client'

import { FormEvent, useEffect, useState, useTransition } from 'react'
import { CheckCircle2, MessageCircle, Sparkles, X } from 'lucide-react'
import { getPrebookingAvailability, submitPrebookingLead } from '@/lib/api/content'
import { getErrorMessage } from '@/lib/api/client'
import type { PrebookingModalCMS } from '@/lib/api/content'

const SUBMITTED_KEY = 'fuyl_prebooking_submitted'
const DISMISSED_KEY = 'fuyl_prebooking_dismissed'
const WHATSAPP_COMMUNITY_URL = process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL?.trim()
const ENV_DONATION_QR_URL = process.env.NEXT_PUBLIC_PREBOOKING_DONATION_QR_URL?.trim()

interface Props {
  cms?: PrebookingModalCMS | null
}

export function PrebookingPopup({ cms }: Props) {
  // All CMS fields with hardcoded fallbacks (same as original)
  const floatingButtonLabel   = cms?.floatingButtonLabel   ?? 'Pre-book now'
  const delayMs               = cms?.delayMs               ?? 900
  const badge                 = cms?.badge                 ?? 'Launching soon'
  const headline              = cms?.headline              ?? 'BE FIRST IN LINE'
  const description           = cms?.description           ?? 'Join the FUYL pre-booking list for early access and launch updates.'
  const submitButtonLabel     = cms?.submitButtonLabel     ?? 'Join pre-booking list'
  const privacyNote           = cms?.privacyNote           ?? "We'll only use your details for FUYL pre-booking updates."
  const showDonation          = cms?.showDonation          ?? true
  const donationLabel         = cms?.donationLabel         ?? 'I would like to make an optional donation'
  const donationSublabel      = cms?.donationSublabel      ?? 'You can still join the pre-booking list without donating.'
  const successHeadline       = cms?.successHeadline       ?? "YOU'RE ON THE LIST!"
  const successDescription    = cms?.successDescription    ?? "We've emailed your confirmation. You'll be among the first to know when pre-booking opens."
  const whatsappButtonLabel   = cms?.whatsappButtonLabel   ?? 'Join our WhatsApp community'
  const continueShoppingLabel = cms?.continueShoppingLabel ?? 'Continue shopping'
  const donationQrUrl = (cms?.donationQrUrl || ENV_DONATION_QR_URL) ?? ''

  const [open, setOpen] = useState(false)
  const [available, setAvailable] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [claimed, setClaimed] = useState(0)
  const [capacity, setCapacity] = useState(cms?.capacity ?? 500)
  const [wantsToDonate, setWantsToDonate] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (localStorage.getItem(SUBMITTED_KEY) === '1') return
    setAvailable(true)
    getPrebookingAvailability()
      .then((value) => { setClaimed(value.claimed); setCapacity(value.capacity) })
      .catch(() => { /* retain safe defaults if availability is temporarily unreachable */ })
    const dismissed = sessionStorage.getItem(DISMISSED_KEY) === '1'
    if (!dismissed) {
      const timer = window.setTimeout(() => setOpen(true), delayMs)
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
    if (success) { setAvailable(false); return }
    sessionStorage.setItem(DISMISSED_KEY, '1')
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const data = new FormData(event.currentTarget)
    startTransition(async () => {
      try {
        const result = await submitPrebookingLead({
          name: String(data.get('name') ?? '').trim(),
          email: String(data.get('email') ?? '').trim(),
          phone: String(data.get('phone') ?? '').trim(),
          source: 'storefront_popup',
          wantsToDonate,
        })
        setClaimed(result.claimed)
        setCapacity(result.capacity)
        localStorage.setItem(SUBMITTED_KEY, '1')
        sessionStorage.removeItem(DISMISSED_KEY)
        setSuccess(true)
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
          <Sparkles size={16} /> {floatingButtonLabel}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-brand-forest/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prebooking-title"
          onMouseDown={(e) => { if (e.target === e.currentTarget) dismiss() }}
        >
          <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <button type="button" onClick={dismiss} className="absolute right-4 top-4 rounded-full p-2 text-brand-muted hover:bg-brand-sage/60 hover:text-brand-forest" aria-label="Close pre-booking form">
              <X size={18} />
            </button>

            {success ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto mb-4 text-brand-teal" size={48} />
                <h2 id="prebooking-title" className="font-display text-3xl text-brand-forest">{successHeadline}</h2>
                <p className="mt-3 text-sm text-brand-muted">{successDescription}</p>
                <p className="mt-3 text-sm font-semibold text-brand-teal">{Math.min(claimed, capacity)} of {capacity} places claimed</p>
                {WHATSAPP_COMMUNITY_URL && (
                  <a
                    href={WHATSAPP_COMMUNITY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#1ebe5d]"
                  >
                    <MessageCircle size={18} /> {whatsappButtonLabel}
                  </a>
                )}
                <button type="button" onClick={() => { setOpen(false); setAvailable(false) }} className="mt-3 text-xs font-semibold text-brand-muted underline underline-offset-4 hover:text-brand-forest">
                  {continueShoppingLabel}
                </button>
              </div>
            ) : (
              <>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-teal">{badge}</span>
                <h2 id="prebooking-title" className="mt-3 pr-8 font-display text-3xl text-brand-forest">{headline}</h2>
                <p className="mt-3 text-sm leading-6 text-brand-muted">{description}</p>
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-brand-forest">
                    <span>{Math.min(claimed, capacity)} claimed</span>
                    <span>{Math.max(0, capacity - claimed)} of {capacity} remaining</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-brand-sage">
                    <div className="h-full rounded-full bg-brand-teal transition-[width] duration-500" style={{ width: `${Math.min(100, (claimed / capacity) * 100)}%` }} />
                  </div>
                </div>
                <form onSubmit={submit} className="mt-6 space-y-4">
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-brand-forest">Name</span><input name="name" required minLength={2} maxLength={120} autoComplete="name" className="w-full rounded-lg border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20" /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-brand-forest">Email</span><input name="email" type="email" required maxLength={200} autoComplete="email" className="w-full rounded-lg border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20" /></label>
                  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-brand-forest">Phone</span><input name="phone" type="tel" required minLength={7} maxLength={24} autoComplete="tel" className="w-full rounded-lg border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20" /></label>
                  {showDonation && (
                    <>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-brand-border bg-brand-sage/20 p-3">
                        <input type="checkbox" checked={wantsToDonate} onChange={(event) => setWantsToDonate(event.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-teal" />
                        <span>
                          <span className="block text-sm font-semibold text-brand-forest">{donationLabel}</span>
                          <span className="mt-0.5 block text-xs text-brand-muted">{donationSublabel}</span>
                        </span>
                      </label>
                      {wantsToDonate && (
                        <div className="rounded-xl border border-brand-border bg-white p-4 text-center">
                          {donationQrUrl
                            ? <><img src={donationQrUrl} alt="Scan to make an optional donation" className="mx-auto h-44 w-44 rounded-lg object-contain" /><p className="mt-2 text-xs text-brand-muted">Scan this QR code with your preferred payment app.</p></>
                            : <p className="text-xs text-amber-700">Donation QR is being configured. You can submit the form without donating.</p>
                          }
                        </div>
                      )}
                    </>
                  )}
                  {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{error}</p>}
                  <button type="submit" disabled={pending} className="w-full rounded-lg bg-brand-forest px-5 py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-brand-teal disabled:opacity-60">
                    {pending ? 'Joining…' : submitButtonLabel}
                  </button>
                </form>
                <p className="mt-4 text-center text-[11px] text-brand-muted">{privacyNote}</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
