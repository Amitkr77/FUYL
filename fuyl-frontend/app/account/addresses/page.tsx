'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/authStore'
import { getAddresses, addAddress, updateAddress, removeAddress, type Address, type AddressInput } from '@/lib/api/customer'

const emptyForm: AddressInput = {
  label: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'IN',
  phone: '', isDefault: false, isBilling: false, isShipping: true,
}

export default function AddressesPage() {
  const { token } = useAuthStore()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [isLoading, setLoading]   = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [isEditing, setEditing]   = useState<string | 'new' | null>(null)
  const [form, setForm]           = useState<AddressInput>(emptyForm)
  const [isSaving, setSaving]     = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = () => {
    if (!token) return
    setLoading(true)
    getAddresses(token)
      .then(setAddresses)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load addresses'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [token])

  const startNew = () => { setForm(emptyForm); setEditing('new'); setFormError(null) }
  const startEdit = (a: Address) => {
    setForm({
      label: a.label, line1: a.line1, line2: a.line2 ?? '', city: a.city, state: a.state,
      postalCode: a.postalCode, country: a.country, phone: a.phone ?? '',
      isDefault: a.isDefault, isBilling: a.isBilling, isShipping: a.isShipping,
      deliveryInstructions: a.deliveryInstructions,
    })
    setEditing(a.id)
    setFormError(null)
  }

  const addressComplete = Boolean(
    form.label.trim() && form.line1.trim() && form.city.trim() && form.state.trim() && form.postalCode.trim(),
  )

  const handleSave = async () => {
    if (!token || !addressComplete) return
    setSaving(true)
    setFormError(null)
    try {
      const updated = isEditing === 'new'
        ? await addAddress(token, form)
        : await updateAddress(token, isEditing!, form)
      setAddresses(updated)
      setEditing(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save address')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id: string) => {
    if (!token || !confirm('Remove this address?')) return
    try {
      await removeAddress(token, id)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove address')
    }
  }

  if (!token) {
    return (
      <div className="container-brand section-py text-center">
        <p className="text-display-md font-display mb-4">SIGN IN TO MANAGE ADDRESSES</p>
        <Link href="/account" className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest">
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-display-xl font-display">MY ADDRESSES</h1>
        {!isEditing && (
          <button
            onClick={startNew}
            className="h-10 px-5 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest"
          >
            Add Address
          </button>
        )}
      </div>

      {isLoading && <p className="text-body-md" style={{ color: 'var(--color-brand-muted)' }}>Loading addresses…</p>}
      {!isLoading && error && (
        <p className="text-body-sm p-3 rounded-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{error}</p>
      )}

      {isEditing && (
        <div className="border rounded-sm p-5 mb-6 space-y-3" style={{ borderColor: 'var(--color-brand-border)' }}>
          <p className="text-label mb-1" style={{ color: 'var(--color-brand-muted)' }}>
            {isEditing === 'new' ? 'New Address' : 'Edit Address'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label (e.g. Home)" required value={form.label} onChange={(v) => setForm((f) => ({ ...f, label: v }))} />
            <Field label="Phone" value={form.phone ?? ''} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
          </div>
          <Field label="Address Line 1" required value={form.line1} onChange={(v) => setForm((f) => ({ ...f, line1: v }))} />
          <Field label="Address Line 2 (optional)" value={form.line2 ?? ''} onChange={(v) => setForm((f) => ({ ...f, line2: v }))} />
          <div className="grid grid-cols-3 gap-3">
            <Field label="City" required value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} />
            <Field label="State" required value={form.state} onChange={(v) => setForm((f) => ({ ...f, state: v }))} />
            <Field label="Postal Code" required value={form.postalCode} onChange={(v) => setForm((f) => ({ ...f, postalCode: v }))} />
          </div>
          <label className="flex items-center gap-2 text-body-sm pt-2">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
            Set as default address
          </label>

          {formError && (
            <p className="text-body-xs p-3 rounded-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{formError}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving || !addressComplete}
              className="h-10 px-5 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="h-10 px-5 text-xs font-semibold uppercase tracking-widest border rounded-sm transition-colors"
              style={{ borderColor: 'var(--color-brand-border)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!isLoading && !error && !isEditing && addresses.length === 0 && (
        <p className="text-body-md" style={{ color: 'var(--color-brand-muted)' }}>No saved addresses yet.</p>
      )}

      {!isEditing && addresses.length > 0 && (
        <div className="flex flex-col gap-4">
          {addresses.map((a) => (
            <div key={a.id} className="border rounded-sm p-5" style={{ borderColor: 'var(--color-brand-border)' }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="text-body-sm font-semibold">{a.label}</p>
                  {a.isDefault && (
                    <span className="text-body-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-sm" style={{ background: 'var(--color-brand-sage)', color: 'var(--color-brand-forest)' }}>
                      Default
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => startEdit(a)} className="text-body-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-brand-muted)' }}>
                    Edit
                  </button>
                  <button onClick={() => handleRemove(a.id)} className="text-body-xs font-semibold uppercase tracking-wide" style={{ color: '#B91C1C' }}>
                    Remove
                  </button>
                </div>
              </div>
              <p className="text-body-sm" style={{ color: 'var(--color-brand-muted)' }}>
                {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.postalCode}
              </p>
              {a.phone && <p className="text-body-xs mt-1" style={{ color: 'var(--color-brand-muted)' }}>{a.phone}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="block text-label mb-1.5" style={{ color: 'var(--color-brand-muted)' }}>
        {label}
        {required && <span style={{ color: 'var(--color-brand-berry)' }}> *</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full h-11 px-3 text-body-sm border rounded-sm outline-none transition-colors"
        style={{ borderColor: 'var(--color-brand-border)' }}
        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-brand-berry)'}
        onBlur={(e)  => e.currentTarget.style.borderColor = 'var(--color-brand-border)'}
      />
    </div>
  )
}
