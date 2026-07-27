import { adminApiFetch, AdminApiError } from './api'

// ─── Backend raw shape ───────────────────────────────────────────────────
// Mirrors fuyl-backend's catalog/models/category.model.ts. Categories are a
// shallow parent-pointer tree (one parentId, no materialized path) — there
// is no true nested "tree" endpoint despite GET /catalog/categories/tree's
// name (it only returns root categories), so this admin UI works off the
// flat list and resolves parent names client-side.
interface BackendCategory {
  _id: string
  name: string
  slug: string
  description?: string
  parentId?: string
  imageUrl?: string
  isActive: boolean
  sortOrder: number
}

export interface AdminCategory {
  id: string
  name: string
  slug: string
  description: string
  parentId: string
  parentName: string   // resolved client-side, '' if none/unresolved
  imageUrl: string
  isActive: boolean
  sortOrder: number
}

export interface AdminCategoryInput {
  name: string
  description: string
  parentId: string     // '' = no parent
  imageUrl: string      // '' = none
  isActive: boolean
  sortOrder: number
}

function mapCategory(c: BackendCategory, nameById: Map<string, string>): AdminCategory {
  return {
    id: c._id,
    name: c.name,
    slug: c.slug,
    description: c.description ?? '',
    parentId: c.parentId ?? '',
    parentName: c.parentId ? (nameById.get(c.parentId) ?? '') : '',
    imageUrl: c.imageUrl ?? '',
    isActive: c.isActive,
    sortOrder: c.sortOrder,
  }
}

function slugify(name: string): string {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  // slug is unique on the backend — a name collision would otherwise 409.
  return `${base || 'category'}-${Date.now().toString(36)}`
}

function categoryBody(input: AdminCategoryInput) {
  return {
    name: input.name,
    description: input.description || undefined,
    parentId: input.parentId || undefined,
    imageUrl: input.imageUrl || undefined,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
  }
}

// Public list (active only) — used by the product form's category picker.
export async function getCategories(): Promise<{ id: string; name: string }[]> {
  try {
    const raw = await adminApiFetch<BackendCategory[]>('/catalog/categories')
    return raw.map((c) => ({ id: c._id, name: c.name }))
  } catch {
    return []
  }
}

// Admin management list — includes inactive categories.
export async function listAdminCategories(): Promise<AdminCategory[]> {
  const raw = await adminApiFetch<BackendCategory[]>('/admin/catalog/categories')
  const nameById = new Map(raw.map((c) => [c._id, c.name]))
  return raw
    .map((c) => mapCategory(c, nameById))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export async function getAdminCategory(id: string): Promise<AdminCategory | null> {
  try {
    const [category, all] = await Promise.all([
      adminApiFetch<BackendCategory>(`/catalog/categories/${id}`),
      adminApiFetch<BackendCategory[]>('/admin/catalog/categories').catch(() => [] as BackendCategory[]),
    ])
    const nameById = new Map(all.map((c) => [c._id, c.name]))
    return mapCategory(category, nameById)
  } catch {
    return null
  }
}

export async function createAdminCategory(input: AdminCategoryInput): Promise<string> {
  const created = await adminApiFetch<{ _id: string }>('/admin/catalog/categories', {
    method: 'POST',
    body: { ...categoryBody(input), slug: slugify(input.name) },
  })
  return created._id
}

export async function updateAdminCategory(id: string, input: AdminCategoryInput): Promise<void> {
  await adminApiFetch(`/admin/catalog/categories/${id}`, {
    method: 'PATCH',
    body: categoryBody(input),
  })
}

// There is no hard-delete endpoint for categories on the backend — archiving
// means deactivating (isActive: false), which hides it from the storefront
// and the product form's picker while keeping products that reference it intact.
export async function setAdminCategoryActive(id: string, isActive: boolean): Promise<void> {
  await adminApiFetch(`/admin/catalog/categories/${id}`, {
    method: 'PATCH',
    body: { isActive },
  })
}

export { AdminApiError }
