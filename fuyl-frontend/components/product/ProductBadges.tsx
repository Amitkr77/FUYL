import { Badge } from '@/components/ui/Badge'

interface ProductBadgesProps {
  tags?: string[]
  badge?: string
}

export function ProductBadges({ tags = [], badge }: ProductBadgesProps) {
  const all = Array.from(new Set([
    ...(badge ? [badge] : []),
    ...tags,
  ]))

  if (all.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {all.map((b) => (
        <Badge key={b} variant="muted">{b}</Badge>
      ))}
    </div>
  )
}
