'use client'

import { useState } from 'react'
import { Plus, Pencil, UserX, UserCheck, X, Check, Eye, EyeOff } from 'lucide-react'
import {
  listStaff, createStaff, updateStaff, deleteStaff,
  ALL_PERMISSIONS, type StaffMember,
} from '@/lib/staff'
import { formatDateTime } from '@/lib/utils'

const PERMISSION_GROUPS = Array.from(
  new Set(ALL_PERMISSIONS.map((p) => p.group))
).map((group) => ({
  group,
  permissions: ALL_PERMISSIONS.filter((p) => p.group === group),
}))

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin:       'bg-blue-100 text-blue-700',
  staff:       'bg-slate-100 text-slate-600',
}

const emptyForm = {
  email: '',
  firstName: '',
  lastName: '',
  role: 'staff' as 'admin' | 'staff',
  permissions: [] as string[],
  password: '',
}

export function StaffTable({ initialStaff }: { initialStaff: StaffMember[] }) {
  const [staff, setStaff]   = useState(initialStaff)
  const [isAdding, setIsAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm]     = useState(emptyForm)
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const refresh = () => listStaff().then(setStaff).catch(() => {})

  const openAdd = () => {
    setForm(emptyForm)
    setEditId(null)
    setIsAdding(true)
    setError('')
  }

  const openEdit = (member: StaffMember) => {
    setForm({
      email:       member.email,
      firstName:   member.firstName ?? '',
      lastName:    member.lastName ?? '',
      role:        member.role === 'super_admin' ? 'admin' : member.role,
      permissions: [...member.permissions],
      password:    '',
    })
    setEditId(member.id)
    setIsAdding(true)
    setError('')
  }

  const togglePerm = (key: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }))
  }

  const handleSave = async () => {
    if (!form.email.trim()) { setError('Email is required'); return }
    if (!editId && !form.password) { setError('Password is required for new staff'); return }
    setSaving(true)
    setError('')
    try {
      if (editId) {
        const { email: _e, password: _p, ...patch } = form
        await updateStaff(editId, patch)
      } else {
        await createStaff(form)
      }
      await refresh()
      setIsAdding(false)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (member: StaffMember) => {
    if (!confirm(`${member.isActive ? 'Deactivate' : 'Reactivate'} ${member.email}?`)) return
    try {
      if (member.isActive) {
        await deleteStaff(member.id)
      } else {
        await updateStaff(member.id, { isActive: true })
      }
      await refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update')
    }
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      {!isAdding && (
        <div className="flex justify-end">
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Staff Member
          </button>
        </div>
      )}

      {/* Form */}
      {isAdding && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
          <h3 className="text-sm font-semibold text-slate-900">
            {editId ? 'Edit Staff Member' : 'New Staff Member'}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">First Name</label>
              <input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#558476]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Last Name</label>
              <input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#558476]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Email *</label>
              <input type="email" value={form.email} disabled={Boolean(editId)}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#558476] disabled:bg-slate-50 disabled:text-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Role</label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'staff' }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#558476]">
                <option value="admin">Admin — full access to all modules</option>
                <option value="staff">Staff — limited by selected permissions below</option>
              </select>
            </div>
            {!editId && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Temporary Password *</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Min 8 characters"
                    className="w-full px-3 py-2 pr-10 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#558476]"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Permissions — only shown for staff role */}
          {form.role === 'staff' && (
            <div>
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">Module Permissions</p>
              <div className="space-y-4">
                {PERMISSION_GROUPS.map(({ group, permissions }) => (
                  <div key={group}>
                    <p className="text-xs font-medium text-slate-400 mb-2">{group}</p>
                    <div className="flex flex-wrap gap-2">
                      {permissions.map((perm) => {
                        const active = form.permissions.includes(perm.key)
                        return (
                          <button
                            key={perm.key}
                            type="button"
                            onClick={() => togglePerm(perm.key)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                              active
                                ? 'bg-[#558476] border-[#558476] text-white'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-[#558476] hover:text-[#558476]'
                            }`}
                          >
                            {active && <Check className="inline w-3 h-3 mr-1" />}
                            {perm.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg disabled:opacity-50">
              <Check className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setIsAdding(false)}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50">
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Staff list */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {staff.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-slate-600">No staff members yet</p>
            <p className="text-xs text-slate-400 mt-1">Add a team member to get started.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Name / Email', 'Role', 'Permissions', 'Last Login', 'Status', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {staff.map((member) => (
                <tr key={member.id} className={`hover:bg-slate-50/60 ${!member.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-slate-900">
                      {member.firstName || member.lastName
                        ? `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim()
                        : '—'}
                    </p>
                    <p className="text-xs text-slate-400">{member.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[member.role] ?? 'bg-slate-100 text-slate-500'}`}>
                      {member.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {member.role === 'admin' || member.role === 'super_admin' ? (
                      <span className="text-xs text-slate-400 italic">Full access</span>
                    ) : member.permissions.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">No permissions</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {member.permissions.map((p) => {
                          const label = ALL_PERMISSIONS.find((ap) => ap.key === p)?.label ?? p
                          return (
                            <span key={p} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs rounded">
                              {label}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                    {member.lastLoginAt ? formatDateTime(member.lastLoginAt) : 'Never'}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${member.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(member)} title="Edit"
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleToggleActive(member)}
                        title={member.isActive ? 'Deactivate' : 'Reactivate'}
                        className={`p-1.5 rounded-lg transition-colors ${member.isActive ? 'text-slate-400 hover:text-red-500 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
                        {member.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
