'use client'

import { useAuthStore } from '@/lib/store/authStore'
import { useAffiliateStore } from '@/lib/store/affiliateStore'
import { StatusBadge } from '@/components/affiliate/shared/StatusBadge'

export function AffiliateUserChip() {
  const { user } = useAuthStore()
  const affiliate = useAffiliateStore((s) => s.affiliate)

  if (!user) return null

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-brand-border shadow-sm">
      <div className="shrink-0 w-8 h-8 rounded-full bg-brand-forest text-white flex items-center justify-center text-body-xs font-bold">
        {initials || '?'}
      </div>
      <div className="min-w-0">
        <p className="text-body-xs font-semibold text-brand-forest truncate leading-tight">
          {user.firstName} {user.lastName}
        </p>
        {affiliate && (
          <StatusBadge
            status={affiliate.status}
            variant="affiliate"
            className="mt-0.5 text-[9px]"
          />
        )}
      </div>
    </div>
  )
}
