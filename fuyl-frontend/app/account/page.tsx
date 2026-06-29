'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/lib/store/authStore'

type Mode = 'login' | 'register'

export default function AccountPage() {
  const [mode, setMode] = useState<Mode>('login')
  const { login, register, isLoading, error, clearError, user, token, logout } = useAuthStore()

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    clearError()
    setForm((f) => ({ ...f, [k]: e.target.value }))
  }

  const handleSubmit = async () => {
    if (mode === 'login') {
      await login(form.email, form.password)
    } else {
      await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password, phone: form.phone })
    }
  }

  // Logged in state
  if (token && user) {
    return (
      <div className="container-brand section-py max-w-md mx-auto text-center">
        <h1 className="text-display-xl font-display mb-4">WELCOME BACK</h1>
        <p className="text-body-md mb-8" style={{ color: 'var(--color-brand-muted)' }}>
          {user.firstName} {user.lastName} · {user.email}
        </p>
        <div className="flex flex-col gap-3">
          <Button variant="secondary" size="lg" fullWidth onClick={() => window.location.href = '/account/orders'}>
            View Orders
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
