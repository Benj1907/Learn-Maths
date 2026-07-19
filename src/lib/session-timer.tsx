'use client'

import { useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import type { Grade } from '@/types'

const END_AT_KEY = 'session-end-at'
const DURATION_KEY = 'session-duration-mins'
const GRADE_KEY = 'session-grade'

type SessionSnapshot = {
  duration: number | null
  timeLeft: number
  active: boolean
  grade: Grade | null
}

const SERVER_SNAPSHOT: SessionSnapshot = { duration: null, timeLeft: 0, active: false, grade: null }

let cachedSnapshot: SessionSnapshot = SERVER_SNAPSHOT
let listeners: Array<() => void> = []

function computeSnapshot(): SessionSnapshot {
  const endAt = sessionStorage.getItem(END_AT_KEY)
  const dur = sessionStorage.getItem(DURATION_KEY)
  const grade = sessionStorage.getItem(GRADE_KEY) as Grade | null
  if (!endAt || !dur) return { duration: null, timeLeft: 0, active: false, grade }
  return {
    duration: parseInt(dur),
    timeLeft: Math.max(0, Math.round((parseInt(endAt) - Date.now()) / 1000)),
    active: true,
    grade,
  }
}

function notify() {
  cachedSnapshot = computeSnapshot()
  listeners.forEach((l) => l())
}

// Each mounted consumer gets its own 1s tick — fine at this app's scale, and
// keeps the store dependency-free (no shared interval to coordinate teardown for).
function subscribe(callback: () => void) {
  listeners.push(callback)
  notify() // pick up real client state immediately after the SSR-safe first render
  const id = setInterval(notify, 1000)
  return () => {
    listeners = listeners.filter((l) => l !== callback)
    clearInterval(id)
  }
}

function getSnapshot(): SessionSnapshot {
  return cachedSnapshot
}

function getServerSnapshot(): SessionSnapshot {
  return SERVER_SNAPSHOT
}

export function selectGrade(grade: Grade) {
  sessionStorage.setItem(GRADE_KEY, grade)
  notify()
}

export function startSession(minutes: number) {
  const endAt = Date.now() + minutes * 60 * 1000
  sessionStorage.setItem(END_AT_KEY, String(endAt))
  sessionStorage.setItem(DURATION_KEY, String(minutes))
  notify()
}

export function endSession() {
  sessionStorage.removeItem(END_AT_KEY)
  sessionStorage.removeItem(DURATION_KEY)
  sessionStorage.removeItem(GRADE_KEY)
  notify()
}

export function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function useSessionTimer() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return {
    ...snapshot,
    timeUp: snapshot.active && snapshot.timeLeft <= 0,
    startSession,
    endSession,
    selectGrade,
  }
}

export function SessionTimerBar() {
  const { active, timeLeft, timeUp, endSession } = useSessionTimer()
  const router = useRouter()

  if (!active) return null

  if (timeUp) {
    return (
      <div className="sticky top-0 z-10 bg-amber-100 text-amber-900 text-sm px-4 py-2.5 text-center">
        ⏰ Temps écoulé ! Tu peux t&apos;arrêter quand tu veux.{' '}
        <button
          onClick={() => {
            endSession()
            router.push('/child')
          }}
          className="underline font-semibold"
        >
          Terminer
        </button>
      </div>
    )
  }

  return (
    <div className="sticky top-0 z-10 bg-indigo-600 text-white text-sm px-4 py-2.5 text-center font-medium">
      ⏱️ {formatTime(timeLeft)} restantes{' '}
      <button
        onClick={() => {
          endSession()
          router.push('/child')
        }}
        className="underline font-normal"
      >
        Arrêter
      </button>
    </div>
  )
}
