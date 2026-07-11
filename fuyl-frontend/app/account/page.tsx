'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/lib/store/authStore'
import { updateProfile } from '@/lib/api/account'

type Mode = 'login' | 'register'

export default function AccountPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect')
  const referralCode = searchParams.get('ref')

  const [mode, setMode] = useState<Mode>(referralCode ? 'register' : 'login')
  const { login, register, isLoading, error, clearError, user, token, logout, setUser } = useAuthStore()

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' })

  const [isEditing, setEditing]   = useState(false)
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phone: '' })
  const [isSaving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setProfileForm({ firstName: user.firstName, lastName: user.lastName, phone: user.phone ?? '' })
    }
  }, [user])

  const handleSaveProfile = async () => {
    if (!token) return
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await updateProfile(token, profileForm)
      setUser(updated)
      setEditing(false)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    clearError()
    setForm((f) => ({ ...f, [k]: e.target.value }))
  }

  // Bounce back to wherever the user came from (e.g. checkout) once signed in.
  useEffect(() => {
    if (token && user && redirectTo) router.replace(redirectTo)
  }, [token, user, redirectTo, router])

  const handleSubmit = async () => {
    if (mode === 'login') {
      await login(form.email, form.password)
    } else {
      // BUG FIXED (found live-testing): the backend's phone field is
      // `z.string().regex(...).optional()` — `.optional()` only permits
      // `undefined`, not an empty string, so leaving phone blank (the
      // common case, since it's optional in this form) always failed
      // registration with "Validation failed". Omit it entirely when empty.
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        phone: form.phone.trim() || undefined,
        referralCode: referralCode ?? undefined,
      })
    }
  }

  // Logged in state
  if (token && user) {
    if (redirectTo) return null // effect above navigates away

    if (isEditing) {
      return (
        <div className="container-brand section-py max-w-md mx-auto">
          <h1 className="text-display-xl font-display mb-8 text-center">EDIT PROFILE</h1>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name" value={profileForm.firstName} onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))} />
              <Field label="Last Name"  value={profileForm.lastName}  onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))} />
            </div>
            <Field label="Phone" value={profileForm.phone} onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))} type="tel" />

            {saveError && (
              <p className="text-body-xs p-3 rounded-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{saveError}</p>
            )}

            <div className="flex gap-3">
              <Button variant="primary" size="lg" fullWidth loading={isSaving} onClick={handleSaveProfile}>
                Save
              </Button>
              <Button variant="outline" size="lg" fullWidth onClick={() => { setEditing(false); setSaveError(null) }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="container-brand section-py max-w-md mx-auto text-center">
        <h1 className="text-display-xl font-display mb-4">WELCOME BACK</h1>
        <p className="text-body-md mb-8" style={{ color: 'var(--color-brand-muted)' }}>
          {user.firstName} {user.lastName} · {user.email}
          {user.phone && <> · {user.phone}</>}
        </p>
        <div className="flex flex-col gap-3">
          <Button variant="secondary" size="lg" fullWidth onClick={() => window.location.href = '/account/orders'}>
            View Orders
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="md" fullWidth onClick={() => window.location.href = '/account/subscriptions'}>
              Subscriptions
            </Button>
            <Button variant="outline" size="md" fullWidth onClick={() => window.location.href = '/account/wallet'}>
              Wallet
            </Button>
            <Button variant="outline" size="md" fullWidth onClick={() => window.location.href = '/account/addresses'}>
              Addresses
            </Button>
            <Button variant="outline" size="md" fullWidth onClick={() => window.location.href = '/account/wishlist'}>
              Wishlist
            </Button>
          </div>
          <Button variant="outline" size="md" fullWidth onClick={() => setEditing(true)}>
            Edit Profile
          </Button>
          <Button variant="outline" size="md" fullWidth onClick={logout}>
            Sign Out
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container-brand section-py max-w-md mx-auto">
      {/* Toggle */}
      <div className="flex border-b mb-8" style={{ borderColor: 'var(--color-brand-border)' }}>
        {(['login', 'register'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); clearError() }}
            className={`flex-1 py-3 text-label transition-colors border-b-2 -mb-px capitalize ${
              mode === m ? 'text-[#8B1A4A] border-[#8B1A4A]' : 'text-[#6B6B6B] border-transparent'
            }`}
          >
            {m === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {mode === 'register' && referralCode && (
          <p className="text-body-xs p-3 rounded-sm" style={{ background: '#E8D9DD', color: '#8B1A4A' }}>
            Referral code <strong>{referralCode}</strong> will be applied when you create your account.
          </p>
        )}
        {mode === 'register' && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" value={form.firstName} onChange={set('firstName')} />
            <Field label="Last Name"  value={form.lastName}  onChange={set('lastName')} />
          </div>
        )}
        <Field label="Email"    value={form.email}    onChange={set('email')}    type="email" />
        <Field label="Password" value={form.password} onChange={set('password')} type="password" />
        {mode === 'register' && (
          <Field label="Phone (optional)" value={form.phone} onChange={set('phone')} type="tel" />
        )}

        {error && (
          <p className="text-body-xs p-3 rounded-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{error}</p>
        )}

        <Button variant="primary" size="lg" fullWidth loading={isLoading} onClick={handleSubmit}>
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </Button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-label mb-1.5" style={{ color: 'var(--color-brand-muted)' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full h-11 px-3 text-body-sm border rounded-sm outline-none transition-colors"
        style={{ borderColor: 'var(--color-brand-border)' }}
        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-brand-berry)'}
        onBlur={(e)  => e.currentTarget.style.borderColor = 'var(--color-brand-border)'}
      />
    </div>
  )
}
