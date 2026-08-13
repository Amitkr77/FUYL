'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Users } from 'lucide-react'
import { login as authenticate } from '@/lib/api/account'
import { getAffiliateMe } from '@/lib/api/affiliate'
import { getErrorMessage } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/authStore'
import { useAffiliateStore } from '@/lib/store/affiliateStore'

export default function AffiliateLoginPage() {
  const router = useRouter()
  const existingToken = useAuthStore((state) => state.token)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(Boolean(existingToken))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!existingToken) {
      setChecking(false)
      return
    }
    getAffiliateMe(existingToken)
      .then((affiliate) => {
        if (affiliate.status === 'approved') {
          useAffiliateStore.getState().setAffiliate(affiliate)
          router.replace('/affiliate/dashboard')
        } else {
          setError(`Your affiliate account is ${affiliate.status}. Dashboard access is available after approval.`)
          setChecking(false)
        }
      })
      .catch(() => setChecking(false))
  }, [existingToken, router])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError('')
    try {
      const session = await authenticate({ email: email.trim(), password })
      const affiliate = await getAffiliateMe(session.accessToken)
      if (affiliate.status !== 'approved') {
        setError(`Your affiliate account is ${affiliate.status}. Dashboard access is available after approval.`)
        return
      }
      useAuthStore.getState().setSession(session.accessToken, session.user)
      useAffiliateStore.getState().setAffiliate(affiliate)
      router.replace('/affiliate/dashboard')
    } catch (err) {
      const message = getErrorMessage(err, 'Could not sign in. Check your email and password.')
      const missingProfile = /not found|404/i.test(message)
      setError(missingProfile ? 'No affiliate account is connected to these login details.' : message)
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return <main className="flex min-h-screen items-center justify-center bg-brand-cream text-sm text-brand-muted">Checking affiliate access…</main>
  }

  return (
    <main className="grid min-h-screen bg-brand-cream lg:grid-cols-2">
      <section className="hidden bg-brand-forest p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/"><Image src="/logo.webp" alt="FUYL" width={220} height={88} className="brightness-0 invert" /></Link>
        <div className="max-w-lg">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10"><Users /></div>
          <h1 className="text-display-lg font-display">AFFILIATE PORTAL</h1>
          <p className="mt-4 text-lg leading-relaxed text-white/70">Track referrals, commissions, payments and promotional links from your dedicated affiliate workspace.</p>
        </div>
        <p className="text-sm text-white/50">This portal is separate from your FUYL customer account area.</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 inline-block lg:hidden"><Image src="/logo.webp" alt="FUYL" width={150} height={60} /></Link>
          <div className="rounded-3xl border border-brand-border bg-white p-7 shadow-xl shadow-brand-forest/5 sm:p-9">
            <div className="mb-7">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-forest text-white"><LockKeyhole size={20} /></div>
              <h2 className="text-display-sm font-display text-brand-forest">AFFILIATE SIGN IN</h2>
              <p className="mt-2 text-sm text-brand-muted">Use the credentials linked to your approved affiliate account.</p>
            </div>

            <form onSubmit={submit} className="space-y-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-muted">Email address
                <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-brand-border bg-brand-cream/40 px-4 text-sm font-normal normal-case tracking-normal outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10" />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-muted">Password
                <div className="relative mt-2">
                  <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border border-brand-border bg-brand-cream/40 px-4 pr-12 text-sm font-normal normal-case tracking-normal outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </div>
              </label>
              {error && <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <button type="submit" disabled={loading || !email.trim() || !password} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-forest text-sm font-semibold text-white transition-colors hover:bg-brand-teal disabled:opacity-50">{loading ? 'Verifying affiliate account…' : 'Sign in to affiliate dashboard'}{!loading && <ArrowRight size={17} />}</button>
            </form>

            <div className="mt-6 border-t border-brand-border pt-6 text-center text-sm text-brand-muted">
              Not an affiliate yet? <Link href="/affiliate/apply" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-teal hover:text-brand-forest">Apply to join</Link>
            </div>
          </div>
          <p className="mt-5 text-center text-xs text-brand-muted">Looking for your orders and profile? <Link href="/account" className="font-semibold text-brand-forest">Customer login</Link></p>
        </div>
      </section>
    </main>
  )
}
