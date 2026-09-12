'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackEvent as _track } from '@/lib/analytics/track'

/** Lightweight client-side event tracker.
 *  Fires on every route change, records time-on-page, device/OS, and
 *  (optionally) lat/lng, then POSTs to the backend /analytics/track endpoint.
 *  No third-party scripts — zero privacy concerns beyond our own backend.
 */

function getDeviceType(): 'Mobile' | 'Tablet' | 'Desktop' {
  const ua = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'Tablet'
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i.test(ua)) return 'Mobile'
  return 'Desktop'
}

function getOS(): string {
  const ua = navigator.userAgent
  if (/windows/i.test(ua)) return 'Windows'
  if (/mac os x/i.test(ua)) return 'macOS'
  if (/android/i.test(ua)) return 'Android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS'
  if (/linux/i.test(ua)) return 'Linux'
  return 'Other'
}

async function sendEvent(event: string, page: string, properties: Record<string, unknown>) {
  await _track(event, properties, { page })
}

let locationCache: { lat: number; lng: number } | null = null
let locationRequested = false

function requestLocation() {
  if (locationRequested || !navigator.geolocation) return
  locationRequested = true
  navigator.geolocation.getCurrentPosition(
    (pos) => { locationCache = { lat: pos.coords.latitude, lng: pos.coords.longitude } },
    () => { /* denied — locationCache stays null */ },
    { maximumAge: 600_000, timeout: 5_000 },
  )
}

export function PageTracker() {
  const pathname = usePathname()
  const entryTimeRef   = useRef<number>(0)
  const prevPathRef    = useRef<string>('')

  useEffect(() => { entryTimeRef.current = Date.now() }, [])

  // Request geolocation lazily on first interaction — avoids an immediate
  // permission prompt on page load which browsers discourage.
  useEffect(() => {
    const onInteract = () => { requestLocation(); window.removeEventListener('click', onInteract) }
    window.addEventListener('click', onInteract, { once: true })
    return () => window.removeEventListener('click', onInteract)
  }, [])

  useEffect(() => {
    const prevPath   = prevPathRef.current
    const now        = Date.now()
    const timeSpentMs = prevPath ? now - entryTimeRef.current : 0

    // Fire an exit event for the previous page before recording the new one
    if (prevPath && timeSpentMs > 0) {
      sendEvent('page.exit', prevPath, {
        timeSpentMs,
        deviceType: getDeviceType(),
        os:         getOS(),
        lat:        locationCache?.lat ?? null,
        lng:        locationCache?.lng ?? null,
      })
    }

    // Record page.view for the new page
    prevPathRef.current = pathname
    entryTimeRef.current = now

    sendEvent('page.view', pathname, {
      deviceType: getDeviceType(),
      os:         getOS(),
      lat:        locationCache?.lat ?? null,
      lng:        locationCache?.lng ?? null,
      referrer:   typeof document !== 'undefined' ? document.referrer : '',
    })
  }, [pathname])

  // On tab close / navigate away — send final exit event
  useEffect(() => {
    const handleBeforeUnload = () => {
      const timeSpentMs = Date.now() - entryTimeRef.current
      sendEvent('page.exit', pathname, {
        timeSpentMs,
        deviceType: getDeviceType(),
        os:         getOS(),
        lat:        locationCache?.lat ?? null,
        lng:        locationCache?.lng ?? null,
      })
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [pathname])

  return null // renders nothing
}
