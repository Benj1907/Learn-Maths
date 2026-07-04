'use client'

import { useSessionTimer } from '@/lib/session-timer'

const DURATIONS = [5, 10, 15, 20, 25, 30] as const

export function DurationPicker() {
  const { startSession } = useSessionTimer()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">⏱️</div>
          <h1 className="text-xl font-bold text-gray-900">Combien de temps veux-tu t&apos;entraîner ?</h1>
          <p className="text-sm text-gray-500 mt-1">Tu pourras faire plusieurs exercices différents pendant ce temps.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {DURATIONS.map((mins) => (
            <button
              key={mins}
              onClick={() => startSession(mins)}
              className="flex flex-col items-center gap-1 border-2 border-gray-100 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl px-2 py-4 transition-colors"
            >
              <span className="text-2xl">⏱️</span>
              <p className="font-semibold text-gray-800">{mins} min</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
