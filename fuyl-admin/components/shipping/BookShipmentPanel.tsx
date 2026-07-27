'use client'

import { useState, useTransition } from 'react'
import { Truck, CheckCircle2, AlertCircle } from 'lucide-react'
import { createShipmentAction } from '@/app/(admin)/shipping/actions'

// Only orders in these states can be booked (mirrors the backend's
// shippable-status check in shipping.service.ts).
const SHIPPABLE = ['confirmed', 'packed']

export function BookShipmentPanel({ orderId, orderStatus }: { orderId: string; orderStatus: string }) {
  const [carrier, setCarrier] = useState('Delhivery')
  const [weight, setWeight] = useState('')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (!SHIPPABLE.includes(orderStatus)) return null

  const book = () => {
    setError('')
    const dims =
      length && width && height
        ? { length: Number(length), width: Number(width), height: Number(height) }
        : undefined
    startTransition(async () => {
      const result = await createShipmentAction({
        orderId,
        carrier: carrier.trim() || 'Delhivery',
        weightGrams: weight ? Number(weight) : undefined,
        dimensionsCm: dims,
      })
      if ('error' in result) { setError(result.error); return }
      setDone(true)
    })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Truck className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">Book Shipment</h3>
      </div>

      {done ? (
        <div className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4" />
          Shipment booked — the order is now marked shipped.
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Carrier</span>
            <input
              type="text"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476]"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-500">Weight (grams)</span>
            <input
              type="number"
              min={0}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 500"
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476]"
            />
          </label>

          <div>
            <span className="text-xs font-medium text-slate-500">Dimensions (cm, optional)</span>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {[
                { v: length, set: setLength, ph: 'L' },
                { v: width, set: setWidth, ph: 'W' },
                { v: height, set: setHeight, ph: 'H' },
              ].map((f, i) => (
                <input
                  key={i}
                  type="number"
                  min={0}
                  value={f.v}
                  onChange={(e) => f.set(e.target.value)}
                  placeholder={f.ph}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476]"
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={book}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? 'Booking…' : 'Book Shipment'}
          </button>
        </div>
      )}
    </div>
  )
}
