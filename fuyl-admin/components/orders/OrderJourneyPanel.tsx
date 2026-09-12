'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Monitor, Smartphone, Globe, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import type { OrderJourney, OrderJourneyEvent } from '@/lib/analytics'
import { formatDateTime } from '@/lib/utils'

// ─── Funnel definition ────────────────────────────────────────────────────────
// The steps a user goes through to place an order, in order.
const FUNNEL_STEPS: { event: string; label: string; sublabel?: string }[] = [
  { event: 'page.view',              label: 'Visited site',        sublabel: 'Browsed the storefront' },
  { event: 'checkout.started',       label: 'Opened checkout',     sublabel: 'Navigated to /checkout' },
  { event: 'checkout.address_saved', label: 'Entered address',     sublabel: 'Completed address step' },
  { event: 'payment.initiated',      label: 'Proceeded to payment',sublabel: 'Clicked "Place Order"' },
  { event: 'order.placed',           label: 'Order placed',        sublabel: 'Order created successfully' },
]

type StepStatus = 'done' | 'stuck' | 'pending'

interface FunnelStepState {
  event:    string
  label:    string
  sublabel: string
  status:   StepStatus
  at:       string | null  // ISO timestamp of first occurrence
  page:     string | null
}

function buildFunnelState(events: OrderJourneyEvent[]): FunnelStepState[] {
  const seen = new Map<string, OrderJourneyEvent>()
  for (const e of events) {
    if (!seen.has(e.event)) seen.set(e.event, e)
  }

  // Find the last step the user completed
  let lastDoneIdx = -1
  for (let i = 0; i < FUNNEL_STEPS.length; i++) {
    if (seen.has(FUNNEL_STEPS[i].event)) lastDoneIdx = i
  }

  return FUNNEL_STEPS.map((step, i) => {
    const hit = seen.get(step.event)
    let status: StepStatus = 'pending'
    if (hit) {
      status = 'done'
    } else if (i === lastDoneIdx + 1 && lastDoneIdx >= 0) {
      // The step right after the last completed one — this is where they stopped
      status = 'stuck'
    }
    return {
      event:    step.event,
      label:    step.label,
      sublabel: step.sublabel ?? '',
      status,
      at:       hit?.occurredAt ?? null,
      page:     hit?.page ?? null,
    }
  })
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (days  > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins  > 0) return `${mins}m ago`
  return 'Just now'
}

const EVENT_LABEL: Record<string, string> = {
  'page.view':              'Page view',
  'page.exit':              'Left page',
  'checkout.started':       'Checkout opened',
  'checkout.address_saved': 'Address saved',
  'payment.initiated':      'Payment initiated',
  'order.placed':           'Order placed ✓',
  'payment.success':        'Payment succeeded ✓',
  'payment.failed':         'Payment failed ✗',
  'cart.add':               'Added to cart',
  'cart.abandoned':         'Cart abandoned',
  'user.login':             'Signed in',
  'user.registered':        'Registered',
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  journey: OrderJourney
}

export function OrderJourneyPanel({ journey }: Props) {
  const [showRaw, setShowRaw]     = useState(false)

  const funnelSteps = buildFunnelState(journey.events)
  const stuckStep   = funnelSteps.find((s) => s.status === 'stuck')
  const orderPlaced = funnelSteps.find((s) => s.event === 'order.placed')?.status === 'done'
  const noData      = journey.events.length === 0

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 p-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">User Journey</h3>
          <span className="text-xs text-slate-400 font-normal">
            {journey.events.length} event{journey.events.length !== 1 ? 's' : ''} recorded
          </span>
        </div>
        {(journey.deviceType || journey.os) && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            {journey.deviceType === 'Mobile' || journey.deviceType === 'Tablet'
              ? <Smartphone className="w-3.5 h-3.5" />
              : <Monitor className="w-3.5 h-3.5" />}
            <span>{[journey.deviceType, journey.os].filter(Boolean).join(' · ')}</span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-5">
        {noData && (
          <div className="text-sm text-slate-400 py-2">
            No pre-order events found for this customer. Events are captured from the storefront
            — older orders placed before tracking was enabled won&apos;t have journey data.
          </div>
        )}

        {/* ── Funnel steps ── */}
        {!noData && (
          <>
            {/* Outcome banner */}
            {orderPlaced ? (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Order was placed successfully
              </div>
            ) : stuckStep ? (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-700 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                User dropped off at &ldquo;{stuckStep.label}&rdquo; — did not complete this step
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 font-medium">
                <XCircle className="w-4 h-4 shrink-0" />
                No checkout activity found — user may have browsed but not attempted checkout
              </div>
            )}

            {/* Vertical funnel */}
            <div className="relative">
              {funnelSteps.map((step, i) => {
                const isLast = i === funnelSteps.length - 1
                return (
                  <div key={step.event} className="flex gap-3">
                    {/* Left: icon + connector line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${
                        step.status === 'done'    ? 'bg-emerald-500 border-emerald-500 text-white'
                        : step.status === 'stuck' ? 'bg-amber-50 border-amber-400 text-amber-500'
                        :                           'bg-slate-50  border-slate-200  text-slate-300'
                      }`}>
                        {step.status === 'done'  ? <CheckCircle2 className="w-4 h-4" />
                        : step.status === 'stuck' ? <AlertCircle  className="w-4 h-4" />
                        :                           <span className="w-2 h-2 rounded-full bg-slate-300" />}
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 flex-1 my-1 ${step.status === 'done' ? 'bg-emerald-200' : 'bg-slate-100'}`} style={{ minHeight: '1.5rem' }} />
                      )}
                    </div>

                    {/* Right: content */}
                    <div className={`pb-4 flex-1 ${isLast ? '' : ''}`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <p className={`text-sm font-medium ${
                            step.status === 'done'  ? 'text-slate-900'
                            : step.status === 'stuck' ? 'text-amber-700'
                            :                           'text-slate-400'
                          }`}>
                            {step.label}
                            {step.status === 'stuck' && (
                              <span className="ml-2 text-xs font-normal bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                stopped here
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400">{step.sublabel}</p>
                        </div>
                        {step.at && (
                          <div className="text-right shrink-0">
                            <p className="text-xs text-slate-500">{formatDateTime(step.at)}</p>
                            <p className="text-xs text-slate-400">{relativeTime(step.at)}</p>
                          </div>
                        )}
                      </div>
                      {step.page && step.event !== 'page.view' && (
                        <p className="mt-0.5 text-xs text-slate-400 font-mono">{step.page}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Raw event log (collapsible) ── */}
            <div className="border border-slate-100 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowRaw((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <span>Raw event log ({journey.events.length} events)</span>
                {showRaw ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showRaw && (
                <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                  {journey.events.map((e, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700">
                          {EVENT_LABEL[e.event] ?? e.event}
                        </p>
                        {e.page && (
                          <p className="text-xs text-slate-400 font-mono truncate">{e.page}</p>
                        )}
                        {typeof e.properties?.timeSpentMs === 'number' && e.properties.timeSpentMs > 0 && (
                          <p className="text-xs text-slate-400">
                            {Math.round(e.properties.timeSpentMs / 1000)}s on page
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 shrink-0 text-right">
                        {formatDateTime(e.occurredAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
