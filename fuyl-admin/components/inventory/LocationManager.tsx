'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Plus, Pencil, Trash2, Star, X, Check } from 'lucide-react'
import type { WarehouseLocation } from '@/lib/inventory'
import {
  listLocationsAction,
  createLocationAction,
  updateLocationAction,
  deleteLocationAction,
} from '@/app/(admin)/inventory/actions'

interface Props {
  initialLocations: WarehouseLocation[]
}

const emptyForm = {
  name: '',
  code: '',
  address: { line1: '', city: '', state: '', postalCode: '', country: 'IN' },
  isDefault: false,
}

export function LocationManager({ initialLocations }: Props) {
  const router = useRouter()
  const [locations, setLocations] = useState(initialLocations)
  const [isAdding, setIsAdding]   = useState(false)
  const [editId, setEditId]       = useState<string | null>(null)
  const [form, setForm]           = useState(emptyForm)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const refresh = () =>
    listLocationsAction().then(setLocations).catch(() => {})

  const openAdd = () => {
    setForm(emptyForm)
    setEditId(null)
    setIsAdding(true)
    setError('')
  }

  const openEdit = (loc: WarehouseLocation) => {
    setForm({
      name: loc.name,
      code: loc.code,
      address: {
        line1:      loc.address?.line1 ?? '',
        city:       loc.address?.city ?? '',
        state:      loc.address?.state ?? '',
        postalCode: loc.address?.postalCode ?? '',
        country:    loc.address?.country ?? 'IN',
      },
      isDefault: loc.isDefault,
    })
    setEditId(loc.id)
    setIsAdding(true)
    setError('')
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setError('Name and code are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = editId
        ? await updateLocationAction(editId, form)
        : await createLocationAction(form)
      if ('error' in result) { setError(result.error); return }
      await refresh()
      setIsAdding(false)
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save location')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this empty location? Locations containing stock or active reservations cannot be deleted.')) return
    try {
      const result = await deleteLocationAction(id)
      if ('error' in result) { setError(result.error); return }
      await refresh()
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete location')
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Warehouse Locations</h3>
        </div>
        {!isAdding && (
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#558476] hover:bg-[#457366] text-white rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Location
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}

      {isAdding && (
        <div className="border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {editId ? 'Edit Location' : 'New Location'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
              <input
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#558476]"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Main Warehouse"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Code * (used as ID)</label>
              <input
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#558476] uppercase"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="MAIN"
                disabled={Boolean(editId)}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">Address Line</label>
              <input
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#558476]"
                value={form.address.line1}
                onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, line1: e.target.value } }))}
                placeholder="Building / Street"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
              <input
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#558476]"
                value={form.address.city}
                onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, city: e.target.value } }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">State</label>
              <input
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#558476]"
                value={form.address.state}
                onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, state: e.target.value } }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">PIN Code</label>
              <input
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#558476]"
                value={form.address.postalCode}
                onChange={(e) => setForm((f) => ({ ...f, address: { ...f.address, postalCode: e.target.value } }))}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              className="rounded"
            />
            Set as default location
          </label>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#558476] hover:bg-[#457366] text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {locations.length === 0 ? (
        <p className="text-sm text-slate-400 py-2">
          No locations yet. The default warehouse (<code className="text-xs bg-slate-100 px-1 rounded">default</code>) is used automatically.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {locations.map((loc) => (
            <div key={loc.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{loc.name}</span>
                  <span className="text-xs font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{loc.code}</span>
                  {loc.isDefault && (
                    <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      Default
                    </span>
                  )}
                  {!loc.isActive && (
                    <span className="text-xs text-slate-400 italic">Inactive</span>
                  )}
                </div>
                {loc.address?.city && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {[loc.address.line1, loc.address.city, loc.address.state, loc.address.postalCode]
                      .filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <button
                  onClick={() => openEdit(loc)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {!loc.isDefault && (
                  <button
                    onClick={() => handleDelete(loc.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
