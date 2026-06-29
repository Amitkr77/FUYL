import { Badge } from '@/components/ui/Badge'

interface ProductBadgesProps {
  tags?: string[]
  badge?: string
}

// Map product tags to display badges
const TAG_MAP: Record<string, string> = {
  'vegetarian':   '🌿 100% Veg',
  'veg':          '🌿 100% Veg',
  'free-shipping':'Free Shipping',
  'made-in-india':'Made in India',
  'no-artificial-colour': 'No Artificial Colour',
}

export function ProductBadges({ tags = [], badge }: ProductBadgesProps) {
  const displayBadges: string[] = []

  if (badge) displayBadges.push(badge)
  tags.forEach((tag) => {
    if (TAG_MAP[tag]) displayBadges.push(TAG_MAP[tag])
  })

  // Always show these FUYL-specific badges
  const staticBadges = ['🌿 100% Veg', 'Free Shipping', 'Made in India']

  const all = Array.from(new Set([...displayBadges, ...staticBadges]))

  return (
    <div className="flex flex-wrap gap-2">
      {all.map((b) => (
        <Badge key={b} variant="muted">{b}</Badge>
      ))}
    </div>
  )
}
