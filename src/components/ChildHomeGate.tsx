'use client'

import { useSessionTimer } from '@/lib/session-timer'
import { DurationPicker } from '@/components/DurationPicker'
import { GradePicker } from '@/components/GradePicker'

export function ChildHomeGate({ children }: { children: React.ReactNode }) {
  const { active, grade } = useSessionTimer()

  if (!active) {
    if (!grade) return <GradePicker />
    return <DurationPicker />
  }

  return <>{children}</>
}
