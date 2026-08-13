'use client'

import { useState, useEffect, useCallback } from 'react'
import { LineChart }    from '@/components/affiliate/shared/LineChart'
import { TabBar }       from '@/components/affiliate/shared/TabBar'
import { getAffiliatePerformance, type PerformanceTab, type PerformanceDataPoint } from '@/lib/api/affiliate'
import { formatPrice }  from '@/lib/utils/formatPrice'
import { useAffiliate } from '@/lib/hooks/useAffiliate'
import { BarChart2 }    from 'lucide-react'

const TABS = [
  { key: 'referrals'  as PerformanceTab, label: 'Referrals'  },
  { key: 'commission' as PerformanceTab, label: 'Commission'  },
  { key: 'sales'      as PerformanceTab, label: 'Sales'       },
  { key: 'clicks'     as PerformanceTab, label: 'Clicks'      },
]

// Pre-built date-range options
function getPreset(days: number): { from: string; to: string } {
  const to   = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(from), to: fmt(to) }
}

const PRESETS = [
  { label: '7d',  days: 7   },
  { label: '30d', days: 30  },
  { label: '90d', days: 90  },
]

// Chart y-axis & tooltip formatters per tab
const FORMATTERS: Record<PerformanceTab, (v: number) => string> = {
  referrals:  (v) => v.toLocaleString('en-IN'),
  commission: (v) => formatPrice(v),
  sales:      (v) => formatPrice(v),
  clicks:     (v) => v.toLocaleString('en-IN'),
}

// Chart line colors per tab
const COLORS: Record<PerformanceTab, string> = {
  referrals:  '#558476',   // brand-teal
  commission: '#3D6459',   // brand-teal-dark
  sales:      '#12291F',   // brand-forest
  clicks:     '#3A4A2E',   // brand-olive
}

export function PerformanceSection() {
  const { token } = useAffiliate()

  const [activeTab, setActiveTab] = useState<PerformanceTab>('clicks')
  const [preset,    setPreset]    = useState(30)
  const [data,      setData]      = useState<PerformanceDataPoint[]>([])
  const [loading,   setLoading]   = useState(false)

  const fetch = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const { from, to } = getPreset(preset)
      const result = await getAffiliatePerformance(token, { from, to, tab: activeTab })
      setData(result)
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [token, activeTab, preset])

  useEffect(() => { void fetch() }, [fetch])

  return (
    <div className="bg-white border border-brand-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border/60">
        <div className="flex items-center gap-2 text-brand-forest">
          <BarChart2 size={15} />
          <span className="text-[11px] font-bold uppercase tracking-wider">Performance</span>
        </div>

        {/* Preset buttons */}
        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setPreset(p.days)}
              className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-lg border transition-colors ${
                preset === p.days
                  ? 'bg-brand-forest text-white border-brand-forest'
                  : 'border-brand-border text-brand-muted hover:border-brand-forest hover:text-brand-forest'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <TabBar
        tabs={TABS}
        active={activeTab}
        onChange={(k) => setActiveTab(k)}
        size="sm"
        className="px-2 pt-1"
      />

      {/* Chart */}
      <div className="p-5">
        <LineChart
          data={data}
          loading={loading}
          color={COLORS[activeTab]}
          formatter={FORMATTERS[activeTab]}
          height={240}
        />
      </div>
    </div>
  )
}
