'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { applyAffiliate } from '@/lib/api/affiliate'
import { getErrorMessage } from '@/lib/api/client'

const CHANNEL_OPTIONS = [
  'Instagram', 'YouTube', 'Facebook', 'Twitter/X', 'Blog',
  'Podcast', 'WhatsApp', 'Email newsletter', 'Other',
]

export default function AffiliateApplyPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', message: '',
  })
  const [channels, setChannels] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const toggleChannel = (ch: string) =>
    setChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) return
    setLoading(true)
    setError('')
    try {
      await applyAffiliate({
        name:     form.name.trim(),
        email:    form.email.trim(),
        phone:    form.phone.trim() || undefined,
        channels,
        message:  form.message.trim() || undefined,
      })
      setDone(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not submit application. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="section-py max-w-lg mx-auto text-center">
        <CheckCircle className="w-14 h-14 text-brand-teal mx-auto mb-5" />
        <h1 className="text-display-lg font-display text-brand-forest mb-3">APPLICATION RECEIVED</h1>
        <p className="text-body-md text-brand-muted mb-8">
          Thank you for applying! We review applications within 2–3 business days
          and will reach out to <strong>{form.email}</strong> with our decision.
        </p>
        <Button variant="primary" size="lg" onClick={() => router.push('/')}>
          Back to Store
        </Button>
      </div>
    )
  }

  return (
    <div className="section-py max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-display-xl font-display text-brand-forest mb-3">
          BECOME AN AFFILIATE
        </h1>
        <p className="text-body-md text-brand-muted">
          Earn <strong className="text-brand-forest">10% commission</strong> on every sale you refer.
          Approved affiliates get a personal tracking link, a real-time dashboard,
          and monthly payouts.
        </p>
      </div>

      {/* Perks */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Commission', value: '10–15%' },
          { label: 'Cookie window', value: '30 days' },
          { label: 'Min. payout', value: '₹500' },
        ].map((p) => (
          <div key={p.label} className="bg-brand-cream border border-brand-border rounded-xl p-4 text-center">
            <p className="text-display-sm font-display text-brand-forest">{p.value}</p>
            <p className="text-label text-brand-muted mt-0.5">{p.label}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-brand-border rounded-2xl p-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name" required value={form.name} onChange={set('name')} />
          <Field label="Email" required type="email" value={form.email} onChange={set('email')} />
        </div>
        <Field label="Phone (optional)" type="tel" value={form.phone} onChange={set('phone')} />

        {/* Channels */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted/80 mb-2">
            Your channels
          </p>
          <div className="flex flex-wrap gap-2">
            {CHANNEL_OPTIONS.map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => toggleChannel(ch)}
                className={`px-3 py-1.5 text-body-xs rounded-full border transition-colors ${
                  channels.includes(ch)
                    ? 'bg-brand-forest text-white border-brand-forest'
                    : 'border-brand-border text-brand-muted hover:border-brand-forest hover:text-brand-forest'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-brand-muted/80 mb-1.5">
            Tell us about your audience (optional)
          </label>
          <textarea
            value={form.message}
            onChange={set('message')}
            rows={3}
            placeholder="e.g. I run a health & fitness Instagram with 15k followers focused on clean nutrition…"
            className="w-full px-4 py-3 text-body-sm bg-brand-cream/40 border border-brand-border rounded-xl outline-none transition-all placeholder:text-brand-muted/40 focus:bg-white focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 resize-none"
          />
        </div>

        {error && (
          <p className="text-body-xs p-3 rounded-xl bg-red-50 text-red-700 border border-red-100">{error}</p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          disabled={!form.name.trim() || !form.email.trim()}
        >
          Submit Application
        </Button>
      </form>
    </div>
  )
}

function Field({
  label, value, onChange, type = 'text', required,
}: {
  label: string; value: string; required?: boolean; type?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-brand-muted/80 mb-1.5">
        {label}{required && <span className="text-brand-teal ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full h-11 px-4 text-body-sm bg-brand-cream/40 border border-brand-border rounded-xl outline-none transition-all placeholder:text-brand-muted/40 focus:bg-white focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10"
      />
    </div>
  )
}
