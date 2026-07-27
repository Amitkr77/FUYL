import { adminApiFetch } from './api'

// Mirrors fuyl-backend's catalog/models/tag.model.ts — a flat, global list of
// {name, slug} documents referenced by Product.tagIds. There's no per-tag
// admin management page yet; tags are created on the fly from the product
// form's tag picker (see resolveTagIds below).

export interface AdminTag {
  id: string
  name: string
}

interface BackendTag {
  _id: string
  name: string
  slug: string
}

function slugify(name: string): string {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return base || 'tag'
}

// Public list — used for the product form's tag-picker suggestions.
export async function getTags(): Promise<AdminTag[]> {
  try {
    const raw = await adminApiFetch<BackendTag[]>('/catalog/tags')
    return raw.map((t) => ({ id: t._id, name: t.name }))
  } catch {
    return []
  }
}

// Resolves free-typed tag names (from the product form) to Tag document ids,
// creating any tag that doesn't exist yet. Matches existing tags
// case-insensitively by name so "Vegetarian" and "vegetarian" don't create
// two separate tag documents.
export async function resolveTagIds(names: string[]): Promise<string[]> {
  const wanted = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)))
  if (wanted.length === 0) return []

  const byName = new Map((await getTags()).map((t) => [t.name.toLowerCase(), t.id]))

  const ids: string[] = []
  for (const name of wanted) {
    const existingId = byName.get(name.toLowerCase())
    if (existingId) {
      ids.push(existingId)
      continue
    }
    try {
      const created = await adminApiFetch<{ _id: string }>('/admin/catalog/tags', {
        method: 'POST',
        body: { name, slug: slugify(name) },
      })
      ids.push(created._id)
      byName.set(name.toLowerCase(), created._id) // guards duplicate names within this same call
    } catch {
      // Slug collision (two tag names slugifying the same, created
      // concurrently elsewhere) — re-fetch rather than silently dropping it.
      const found = (await getTags()).find((t) => t.name.toLowerCase() === name.toLowerCase())
      if (found) ids.push(found.id)
    }
  }
  return ids
}
