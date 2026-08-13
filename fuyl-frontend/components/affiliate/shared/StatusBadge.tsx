import { cn } from '@/lib/utils/cn'
import type { CommissionStatus, AffiliateStatus, PayoutStatus } from '@/lib/api/affiliate'

// ─── Commission status ────────────────────────────────────────────────────────

const COMMISSION_STYLES: Record<CommissionStatus, string> = {
  pending:   'bg-amber-50   text-amber-700   border-amber-200',
  approved:  'bg-blue-50    text-blue-700    border-blue-200',
  payable:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  paid:      'bg-slate-100  text-slate-500   border-slate-200',
  cancelled: 'bg-red-50     text-red-600     border-red-200',
  reversed:  'bg-red-50     text-red-600     border-red-200',
}

// ─── Affiliate account status ─────────────────────────────────────────────────

const AFFILIATE_STYLES: Record<AffiliateStatus, string> = {
  pending:   'bg-amber-50   text-amber-700   border-amber-200',
  approved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected:  'bg-red-50     text-red-600     border-red-200',
  suspended: 'bg-orange-50  text-orange-700  border-orange-200',
}

// ─── Payout status ────────────────────────────────────────────────────────────

const PAYOUT_STYLES: Record<PayoutStatus, string> = {
  pending:    'bg-amber-50   text-amber-700   border-amber-200',
  processing: 'bg-blue-50    text-blue-700    border-blue-200',
  paid:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed:     'bg-red-50     text-red-600     border-red-200',
}

type StatusVariant = 'commission' | 'affiliate' | 'payout'

interface StatusBadgeProps {
  status:     string
  variant?:   StatusVariant
  className?: string
}

function getStyle(status: string, variant: StatusVariant): string {
  if (variant === 'commission' && status in COMMISSION_STYLES) {
    return COMMISSION_STYLES[status as CommissionStatus]
  }
  if (variant === 'affiliate' && status in AFFILIATE_STYLES) {
    return AFFILIATE_STYLES[status as AffiliateStatus]
  }
  if (variant === 'payout' && status in PAYOUT_STYLES) {
    return PAYOUT_STYLES[status as PayoutStatus]
  }
  return 'bg-slate-100 text-slate-500 border-slate-200'
}

export function StatusBadge({ status, variant = 'commission', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border capitalize',
        getStyle(status, variant),
        className,
      )}
    >
      {status}
    </span>
  )
}
