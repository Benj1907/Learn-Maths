'use client'

import { useSessionTimer } from '@/lib/session-timer'
import { GRADES, GRADE_LABELS } from '@/types'

export function GradePicker() {
  const { selectGrade } = useSessionTimer()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🎒</div>
          <h1 className="text-xl font-bold text-gray-900">Dans quelle classe es-tu ?</h1>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {GRADES.map((grade) => (
            <button
              key={grade}
              onClick={() => selectGrade(grade)}
              className="flex flex-col items-center gap-1 border-2 border-gray-100 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl px-2 py-4 transition-colors"
            >
              <span className="font-semibold text-gray-800">{GRADE_LABELS[grade]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
