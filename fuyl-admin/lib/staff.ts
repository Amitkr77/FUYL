import { adminApiFetch } from './api'

export interface StaffMember {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: 'admin' | 'super_admin' | 'staff'
  permissions: string[]
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
}

interface BackendUser {
  _id: string
  email: string
  firstName?: string
  lastName?: string
  role: string
  permissions: string[]
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
}

function mapStaff(u: BackendUser): StaffMember {
  return {
    id: u._id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role as StaffMember['role'],
    permissions: u.permissions ?? [],
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
  }
}

export const ALL_PERMISSIONS = [
  { key: 'wallet:manage',         label: 'Wallet',        group: 'Finance' },
  { key: 'discounts:manage',      label: 'Discounts',     group: 'Marketing' },
  { key: 'inventory:manage',      label: 'Inventory',     group: 'Commerce' },
  { key: 'shipping:manage',       label: 'Shipping',      group: 'Commerce' },
  { key: 'returns:manage',        label: 'Returns',       group: 'Commerce' },
  { key: 'subscriptions:manage',  label: 'Subscriptions', group: 'Commerce' },
  { key: 'referrals:manage',      label: 'Referrals',     group: 'Marketing' },
  { key: 'customers:manage',      label: 'Customers',     group: 'Commerce' },
] as const

export async function listStaff(): Promise<StaffMember[]> {
  const raw = await adminApiFetch<BackendUser[]>('/admin/staff')
  return raw.map(mapStaff)
}

export async function createStaff(data: {
  email: string
  firstName?: string
  lastName?: string
  role: 'admin' | 'staff'
  permissions: string[]
  password: string
}): Promise<StaffMember> {
  const raw = await adminApiFetch<BackendUser>('/admin/staff', { method: 'POST', body: data })
  return mapStaff(raw)
}

export async function updateStaff(id: string, data: Partial<{
  firstName: string
  lastName: string
  role: 'admin' | 'staff'
  permissions: string[]
  isActive: boolean
}>): Promise<StaffMember> {
  const raw = await adminApiFetch<BackendUser>(`/admin/staff/${id}`, { method: 'PATCH', body: data })
  return mapStaff(raw)
}

export async function deleteStaff(id: string): Promise<void> {
  await adminApiFetch(`/admin/staff/${id}`, { method: 'DELETE' })
}
