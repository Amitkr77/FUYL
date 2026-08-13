'use client'

import { useState, useEffect } from 'react'
import { useAffiliate }        from '@/lib/hooks/useAffiliate'
import { updateAffiliateProfile } from '@/lib/api/affiliate'
import { getErrorMessage }     from '@/lib/api/client'
import { useAffiliateStore }   from '@/lib/store/affiliateStore'
import { User, Phone, Globe, Check } from 'lucide-react'

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  readOnly,
  required,
}: {
  label:        string
  value:        string
  onChange?:    (v: string) => void
  placeholder?: string
  type?:        string
  readOnly?:    boolean
  required?:    boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        className={`h-9 px-3 text-body-xs border border-brand-border rounded-lg outline-none transition-all ${
          readOnly
            ? 'bg-brand-cream/60 text-brand-muted cursor-default'
            : 'bg-white focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20'
        }`}
      />
    </div>
  )
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHead({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Icon size={13} className="text-brand-forest" />
      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-forest">{label}</p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfileTab() {
  const { token, affiliate } = useAffiliate()
  const setAffiliate         = useAffiliateStore((s) => s.setAffiliate)

  // Split stored `name` → firstName + lastName for UX
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [phone,     setPhone]     = useState('')

  // Social / marketing channels
  const [website,   setWebsite]   = useState('')
  const [facebook,  setFacebook]  = useState('')
  const [youtube,   setYoutube]   = useState('')
  const [instagram, setInstagram] = useState('')
  const [tiktok,    setTiktok]    = useState('')
  const [twitter,   setTwitter]   = useState('')

  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState('')

  // Seed form from affiliate profile
  useEffect(() => {
    if (!affiliate) return
    const parts     = (affiliate.name ?? '').trim().split(/\s+/)
    setFirstName(parts[0] ?? '')
    setLastName(parts.slice(1).join(' '))
    setPhone(affiliate.phone ?? '')
    setWebsite(affiliate.metadata?.website ?? '')
    const h = affiliate.metadata?.socialHandles ?? {}
    setFacebook(h.facebook  ?? '')
    setYoutube(h.youtube    ?? '')
    setInstagram(h.instagram ?? '')
    setTiktok(h.tiktok      ?? '')
    setTwitter(h.twitter    ?? '')
  }, [affiliate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const updated = await updateAffiliateProfile(token, {
        name:    [firstName.trim(), lastName.trim()].filter(Boolean).join(' '),
        phone:   phone.trim() || undefined,
        website: website.trim() || undefined,
        socialHandles: {
          facebook:  facebook.trim()  || undefined,
          youtube:   youtube.trim()   || undefined,
          instagram: instagram.trim() || undefined,
          tiktok:    tiktok.trim()    || undefined,
          twitter:   twitter.trim()   || undefined,
        } as Record<string, string>,
      })
      setAffiliate(updated)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save profile.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">

      {/* Identity */}
      <div className="bg-white border border-brand-border rounded-xl p-5 space-y-4">
        <SectionHead icon={User} label="Identity" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First Name" value={firstName} onChange={setFirstName} placeholder="Jane" required />
          <Field label="Last Name"  value={lastName}  onChange={setLastName}  placeholder="Doe"  />
          <Field label="Email"      value={affiliate?.email ?? ''} readOnly />
          <Field label="Phone"      value={phone}     onChange={setPhone}     placeholder="+91 98765 43210" type="tel" />
        </div>
      </div>

      {/* Online presence */}
      <div className="bg-white border border-brand-border rounded-xl p-5 space-y-4">
        <SectionHead icon={Globe} label="Online Presence" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Website"
            value={website}
            onChange={setWebsite}
            placeholder="https://yoursite.com"
            type="url"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Instagram"  value={instagram}  onChange={setInstagram}  placeholder="@handle" />
          <Field label="YouTube"    value={youtube}    onChange={setYoutube}    placeholder="@channel or URL" />
          <Field label="Facebook"   value={facebook}   onChange={setFacebook}   placeholder="page name or URL" />
          <Field label="TikTok"     value={tiktok}     onChange={setTiktok}     placeholder="@handle" />
          <Field label="X (Twitter)" value={twitter}   onChange={setTwitter}    placeholder="@handle" />
        </div>
      </div>

      {/* Channels */}
      {affiliate?.channels && affiliate.channels.length > 0 && (
        <div className="bg-white border border-brand-border rounded-xl p-5 space-y-3">
          <SectionHead icon={Phone} label="Promotion Channels" />
          <div className="flex flex-wrap gap-2">
            {affiliate.channels.map((ch) => (
              <span
                key={ch}
                className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-brand-sage text-brand-forest border border-brand-border"
              >
                {ch}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-brand-muted">
            Contact support to update your promotion channels.
          </p>
        </div>
      )}

      {error && (
        <p className="text-body-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-brand-forest text-white text-label tracking-wider uppercase rounded-lg hover:bg-brand-olive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
        {success && (
          <span className="inline-flex items-center gap-1.5 text-body-xs text-brand-teal font-semibold">
            <Check size={14} /> Saved!
          </span>
        )}
      </div>
    </form>
  )
}
