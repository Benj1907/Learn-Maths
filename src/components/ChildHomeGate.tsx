'use client'

import { useSessionTimer } from '@/lib/session-timer'
import { DurationPicker } from '@/components/DurationPicker'

export function ChildHomeGate({ children }: { children: React.ReactNode }) {
  const { active } = useSessionTimer()

  if (!active) return <DurationPicker />

  return <>{children}</>
}
