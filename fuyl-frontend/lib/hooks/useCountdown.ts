'use client'

import { useState, useEffect } from 'react'

interface TimeLeft {
  days:    number
  hours:   number
  minutes: number
  seconds: number
}

export function useCountdown(targetDate: string | Date): TimeLeft {
  const target = new Date(targetDate).getTime()

  const calc = (): TimeLeft => {
    const diff = Math.max(0, target - Date.now())
    return {
      days:    Math.floor(diff / 86_400_000),
      hours:   Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000)  /    60_000),
      seconds: Math.floor((diff % 60_000)      /     1_000),
    }
  }

  const [time, setTime] = useState<TimeLeft>(calc)

  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(id)
  }, [target])

  return time
}
