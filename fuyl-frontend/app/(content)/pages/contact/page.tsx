'use client'

import { useState } from 'react'
import { generateSEO } from '@/lib/utils/seo'
import { ScrollReveal } from '@/components/ui/ScrollReveal'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { SITE } from '@/lib/constants/site'
import { Mail, Phone, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { submitContactForm } from '@/lib/api/content'

// Note: metadata export can't live in a 'use client' file
// Move to a separate layout or server wrapper if needed — kept simple here
// export const metadata = generateSEO({ title: 'Contact' })

type FormState = 'idle' | 'loading' | 'success' | 'error'

const TOPICS = [
  'Order / Shipping Query',
  'Product Question',
  'Return / Refund Request',
  'Wholesale / B2B Enquiry',
  'Press / Media',
  'Ambassador Programme',
  'Other',
]

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-label" style={{ color: 'var(--color-brand-muted)' }}>
        {label}{required && <span style={{ color: 'var(--color-brand-berry)' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = "w-full h-11 px-3 text-body-sm border rounded-sm outline-none transition-colors bg-white"
const inputStyle = { borderColor: 'var(--color-brand-border)' }

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', topic: '', message: '' })
  const [status, setStatus] = useState<FormState>('idle')

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    try {
      await submitContactForm(form)
      setStatus('success')
      setForm({ name: '', email: '', phone: '', topic: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  const focusStyle = (e: React.FocusEvent<HTMLElement>) =>
    ((e.target as HTMLElement).style.borderColor = 'var(--color-brand-berry)')
  const blurStyle  = (e: React.FocusEvent<HTMLElement>) =>
    ((e.target as HTMLElement).style.borderColor = 'var(--color-brand-border)')

  return (
    <>
      {/* Hero */}
      <section className="section-py" style={{ background: 'var(--color-brand-cream)' }}>
        <div className="container-brand">
          <Breadcrumbs className="mb-5" items={[{ label: 'Contact' }]} />
          <ScrollReveal>
            <p className="text-label mb-3" style={{ color: 'var(--color-brand-berry)' }}>Get in Touch</p>
            <h1 className="text-display-2xl font-display mb-4">LET'S TALK.</h1>
            <p className="text-body-lg max-w-xl" style={{ color: 'var(--color-brand-muted)' }}>
              Questions about your order, the product, or anything else — we respond to every message within 24 hours.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="section-py" style={{ background: 'var(--color-brand-white)' }}>
        <div className="container-brand grid grid-cols-1 gap-14 lg:grid-cols-3 lg:gap-16">

          {/* Contact info */}
          <div className="flex flex-col gap-8">
            <ScrollReveal>
              <h2 className="text-display-md font-display mb-6">CONTACT INFO</h2>
              <div className="space-y-5">
                {[
                  { icon: Mail,    label: 'Email',    value: SITE.email,    href: `mailto:${SITE.email}` },
                  { icon: Phone,   label: 'WhatsApp', value: SITE.phone,    href: `tel:${SITE.phone}` },
                  { icon: Clock,   label: 'Hours',    value: 'Mon–Sat · 9am–6pm IST', href: null },
                  { icon: MapPin,  label: 'Company',  value: SITE.company,  href: null },
                ].map(({ icon: Icon, label, value, href }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0" style={{ background: 'var(--color-brand-cream)' }}>
                      <Icon size={16} style={{ color: 'var(--color-brand-berry)' }} />
                    </div>
                    <div>
                      <p className="text-body-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-brand-muted)' }}>{label}</p>
                      {href
                        ? <a href={href} className="text-body-sm font-medium hover:text-[#8B1A4A] transition-colors">{value}</a>
                        : <p className="text-body-sm">{value}</p>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* Waitlist promo */}
            <ScrollReveal delay={100}>
              <div className="p-5 rounded-sm" style={{ background: 'var(--color-brand-berry)', color: 'white' }}>
                <p className="text-label mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>Early Access</p>
                <p className="text-body-md font-semibold mb-2">Join the Waitlist</p>
                <p className="text-body-sm mb-4" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  Be the first to know when new batches drop. Waitlist members get 15% off their first order.
                </p>
                <a
                  href="#contact-form"
                  className="inline-flex items-center text-body-sm font-semibold"
                  style={{ color: 'rgba(255,255,255,0.9)' }}
                >
                  Sign up below →
                </a>
              </div>
            </ScrollReveal>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <ScrollReveal delay={80}>
              {status === 'success' ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                  <span className="text-5xl">✅</span>
                  <p className="text-display-md font-display">MESSAGE SENT!</p>
                  <p className="text-body-md" style={{ color: 'var(--color-brand-muted)' }}>
                    We'll get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => setStatus('idle')}
                    className="mt-4 text-body-sm font-semibold hover:text-[#8B1A4A] transition-colors"
                  >
                    Send another message →
                  </button>
                </div>
              ) : (
                <form id="contact-form" onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field label="Full Name" required>
                      <input
                        type="text" value={form.name} onChange={set('name')} required
                        className={inputCls} style={inputStyle}
                        onFocus={focusStyle} onBlur={blurStyle}
                        placeholder="Priya Sharma"
                      />
                    </Field>
                    <Field label="Email Address" required>
                      <input
                        type="email" value={form.email} onChange={set('email')} required
                        className={inputCls} style={inputStyle}
                        onFocus={focusStyle} onBlur={blurStyle}
                        placeholder="priya@example.com"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Field label="Phone (optional)">
                      <input
                        type="tel" value={form.phone} onChange={set('phone')}
                        className={inputCls} style={inputStyle}
                        onFocus={focusStyle} onBlur={blurStyle}
                        placeholder="+91 98765 43210"
                      />
                    </Field>
                    <Field label="Topic" required>
                      <select
                        value={form.topic} onChange={set('topic')} required
                        className={inputCls} style={inputStyle}
                        onFocus={focusStyle} onBlur={blurStyle}
                      >
                        <option value="">Select a topic…</option>
                        {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </Field>
                  </div>

                  <Field label="Message" required>
                    <textarea
                      value={form.message} onChange={set('message')} required
                      rows={6}
                      className="w-full px-3 py-2.5 text-body-sm border rounded-sm outline-none transition-colors resize-none bg-white"
                      style={inputStyle}
                      onFocus={focusStyle} onBlur={blurStyle}
                      placeholder="Tell us how we can help…"
                    />
                  </Field>

                  {status === 'error' && (
                    <p className="text-body-xs p-3 rounded-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
                      Something went wrong. Please try emailing us at {SITE.email}
                    </p>
                  )}

                  <Button variant="primary" size="lg" loading={status === 'loading'} type="submit">
                    Send Message
                  </Button>

                  <p className="text-body-xs" style={{ color: 'var(--color-brand-muted)' }}>
                    We respond to all messages within 24 hours on business days.
                  </p>
                </form>
              )}
            </ScrollReveal>
          </div>
        </div>
      </section>
    </>
  )
}
