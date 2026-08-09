'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

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

function getSessionId(): string {
  const key = '_fuyl_sid'
  let sid = sessionStorage.getItem(key)
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem(key, sid)
  }
  return sid
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

async function sendEvent(payload: Record<string, unknown>) {
  try {
    await fetch(`${BACKEND_URL}/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,       // survives page unload (needed for exit events)
    })
  } catch { /* analytics errors must never affect the storefront */ }
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
  const entryTimeRef   = useRef<number>(Date.now())
  const prevPathRef    = useRef<string>('')

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
      sendEvent({
        event:     'page.exit',
        sessionId: getSessionId(),
        page:      prevPath,
        properties: {
          timeSpentMs,
          deviceType: getDeviceType(),
          os:         getOS(),
          lat:        locationCache?.lat ?? null,
          lng:        locationCache?.lng ?? null,
        },
      })
    }

    // Record page.view for the new page
    prevPathRef.current = pathname
    entryTimeRef.current = now

    sendEvent({
      event:     'page.view',
      sessionId: getSessionId(),
      page:      pathname,
      referrer:  typeof document !== 'undefined' ? document.referrer : '',
      properties: {
        deviceType: getDeviceType(),
        os:         getOS(),
        lat:        locationCache?.lat ?? null,
        lng:        locationCache?.lng ?? null,
      },
    })
  }, [pathname])

  // On tab close / navigate away — send final exit event
  useEffect(() => {
    const handleBeforeUnload = () => {
      const timeSpentMs = Date.now() - entryTimeRef.current
      sendEvent({
        event:     'page.exit',
        sessionId: getSessionId(),
        page:      pathname,
        properties: {
          timeSpentMs,
          deviceType: getDeviceType(),
          os:         getOS(),
          lat:        locationCache?.lat ?? null,
          lng:        locationCache?.lng ?? null,
        },
      })
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [pathname])

  return null // renders nothing
}
