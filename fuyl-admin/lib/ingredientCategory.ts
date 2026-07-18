// Split out of lib/content.ts on purpose — that module imports adminApiFetch
// (server-only, needs next/headers via lib/auth.ts), so a Client Component
// that needs a real (non-type) value from it, not just a type, pulls that
// whole server-only chain into the client bundle and fails to build (same
// issue as lib/orderStatus.ts). This file has zero imports, so the
// ingredient new/edit forms can import INGREDIENT_CATEGORIES from here.

export const INGREDIENT_CATEGORIES = [
  'greens', 'berries', 'adaptogens', 'probiotics', 'vitamins', 'omegas', 'enzymes', 'antioxidants',
] as const

export type IngredientCategory = typeof INGREDIENT_CATEGORIES[number]
