'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  generateDivisionQuestion,
  generateFractionAdditionQuestion,
  generateFractionMultiplicationQuestion,
  getCorrectAnswer,
  getExplanation,
  checkAnswer,
  getFractionMultiplicationAnswer,
} from '@/lib/exercises'
import type { Difficulty, ExerciseQuestion, Topic } from '@/types'
import { DIFFICULTY_DESCRIPTIONS, DIFFICULTY_EMOJI, DIFFICULTY_LABELS, TOPIC_LABELS } from '@/types'

const TOTAL = 10

function FractionDisplay({ num, den }: { num: number; den: number }) {
  if (den === 1) return <span className="text-2xl font-bold">{num}</span>
  return (
    <span className="fraction text-2xl font-bold mx-1">
      <span className="numerator">{num}</span>
      <span className="denominator">{den}</span>
    </span>
  )
}

function QuestionDisplay({ q }: { q: ExerciseQuestion }) {
  if (q.type === 'division_decimale') {
    return (
      <p className="text-3xl font-bold text-gray-800">
        {q.dividend} ÷ {q.divisor} = ?
      </p>
    )
  }
  if (q.type === 'fractions_addition') {
    const op = q.operation
    return (
      <div className="flex items-center gap-3 text-gray-800 justify-center flex-wrap">
        <FractionDisplay num={q.fraction1.num} den={q.fraction1.den} />
        <span className="text-3xl font-bold">{op}</span>
        <FractionDisplay num={q.fraction2.num} den={q.fraction2.den} />
        <span className="text-3xl font-bold">= ?</span>
      </div>
    )
  }
  // multiplication
  return (
    <div className="flex items-center gap-3 text-gray-800 justify-center flex-wrap">
      <FractionDisplay num={q.fraction1.num} den={q.fraction1.den} />
      <span className="text-3xl font-bold">×</span>
      <FractionDisplay num={q.fraction2.num} den={q.fraction2.den} />
      <span className="text-3xl font-bold">= ?</span>
    </div>
  )
}

function generateQuestion(topic: Topic, difficulty: Difficulty): ExerciseQuestion {
  switch (topic) {
    case 'division_decimale':
      return generateDivisionQuestion(difficulty)
    case 'fractions_addition':
      return generateFractionAdditionQuestion(difficulty)
    case 'fractions_multiplication':
      return generateFractionMultiplicationQuestion(difficulty)
  }
}

export default function ExercisePage() {
  const params = useParams()
  const router = useRouter()
  const topic = params.topic as Topic

  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [questions, setQuestions] = useState<ExerciseQuestion[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [fracNum, setFracNum] = useState('')
  const [fracDen, setFracDen] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startSession(d: Difficulty) {
    const qs: ExerciseQuestion[] = Array.from({ length: TOTAL }, () => generateQuestion(topic, d))
    setDifficulty(d)
    setQuestions(qs)
    setCurrentIdx(0)
    setScore(0)
    setAnswer('')
    setFracNum('')
    setFracDen('')
    setSubmitted(false)
    setDone(false)
  }

  const currentQ = questions[currentIdx]

  const handleSubmit = useCallback(
    async (selectedOption?: string) => {
      if (!currentQ || submitted) return

      let userAnswer: string
      if (currentQ.type === 'fractions_multiplication') {
        if (!fracNum || !fracDen) return
        // Normalise: simplify what the user typed
        const n = parseInt(fracNum)
        const d = parseInt(fracDen)
        if (isNaN(n) || isNaN(d) || d === 0) return
        userAnswer = `${n}/${d}`
        // Also accept simplified form
        const correct = getFractionMultiplicationAnswer(currentQ)
        const simplifiedInput = (() => {
          const g = (a: number, b: number): number => (b === 0 ? a : g(b, a % b))
          const gc = g(Math.abs(n), Math.abs(d))
          return `${n / gc}/${d / gc}`
        })()
        const isOk =
          simplifiedInput === `${correct.num}/${correct.den}` ||
          userAnswer === `${correct.num}/${correct.den}`
        const correctStr = getCorrectAnswer(currentQ)
        saveAndAdvance(currentQ, userAnswer, correctStr, isOk)
        return
      } else if (currentQ.type === 'fractions_addition') {
        userAnswer = selectedOption ?? answer
      } else {
        userAnswer = answer
      }

      const correct = checkAnswer(currentQ, userAnswer)
      const correctStr = getCorrectAnswer(currentQ)
      saveAndAdvance(currentQ, userAnswer, correctStr, correct)
    },
    [currentQ, submitted, answer, fracNum, fracDen]
  )

  function saveAndAdvance(
    q: ExerciseQuestion,
    userAnswer: string,
    correctStr: string,
    correct: boolean
  ) {
    setSubmitted(true)
    setIsCorrect(correct)
    if (correct) setScore((s) => s + 1)

    if (userId) {
      supabase
        .from('exercise_attempts')
        .insert({
          user_id: userId,
          topic: q.type,
          question: q as unknown as Record<string, unknown>,
          user_answer: userAnswer,
          correct_answer: correctStr,
          is_correct: correct,
        })
        .then(({ error }) => {
          if (error) console.error('Failed to save attempt:', error.message)
        })
    } else {
      console.warn('No authenticated user — attempt not saved')
    }
  }

  function nextQuestion() {
    if (currentIdx + 1 >= TOTAL) {
      setDone(true)
    } else {
      setCurrentIdx((i) => i + 1)
      setAnswer('')
      setFracNum('')
      setFracDen('')
      setSubmitted(false)
    }
  }

  if (!TOPIC_LABELS[topic]) {
    return <p className="p-8 text-center text-red-500">Thème inconnu.</p>
  }

  if (!difficulty) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <button
            onClick={() => router.push('/child')}
            className="text-sm text-gray-400 hover:text-gray-600 mb-6 block"
          >
            ← Retour
          </button>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Choisis ton niveau</h2>
          <p className="text-sm text-gray-500 mb-6">{TOPIC_LABELS[topic]}</p>
          <div className="space-y-3">
            {(['verte', 'orange', 'noire'] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => startSession(d)}
                className="w-full flex items-center gap-4 border-2 border-gray-100 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl px-4 py-3 transition-colors text-left"
              >
                <span className="text-2xl">{DIFFICULTY_EMOJI[d]}</span>
                <div>
                  <p className="font-semibold text-gray-800">{DIFFICULTY_LABELS[d]}</p>
                  <p className="text-xs text-gray-500">{DIFFICULTY_DESCRIPTIONS[d]}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (done) {
    const stars = score >= 8 ? 3 : score >= 6 ? 2 : score >= 4 ? 1 : 0
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Exercice terminé !</h2>
          <p className="text-sm text-gray-400 mb-3">{DIFFICULTY_EMOJI[difficulty]} {DIFFICULTY_LABELS[difficulty]}</p>
          <p className="text-5xl font-extrabold text-indigo-600 my-4">{score}/{TOTAL}</p>
          <p className="text-3xl mb-6">{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</p>
          <p className="text-gray-500 text-sm mb-6">
            {score === TOTAL
              ? 'Parfait ! Bravo !'
              : score >= 8
              ? 'Excellent travail !'
              : score >= 6
              ? 'Bien joué, continue comme ça !'
              : score >= 4
              ? 'Pas mal, entraîne-toi encore !'
              : 'Continue, tu vas y arriver !'}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => startSession(difficulty)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              Recommencer
            </button>
            <button
              onClick={() => setDifficulty(null)}
              className="w-full border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold py-2.5 rounded-xl transition-colors"
            >
              Changer de niveau
            </button>
            <button
              onClick={() => router.push('/child')}
              className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors"
            >
              Choisir un autre thème
            </button>
          </div>
        </div>
      </div>
    )
  }

  const progress = Math.round((currentIdx / TOTAL) * 100)

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.push('/child')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Retour
          </button>
          <span className="text-sm font-medium text-gray-600">
            {currentIdx + 1} / {TOTAL}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
          <div
            className="bg-indigo-500 h-2.5 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Topic label */}
        <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
          {TOPIC_LABELS[topic]}
        </p>

        {/* Question card */}
        <div className="bg-white rounded-2xl shadow p-6 mb-4">
          <div className="flex justify-center py-4">
            <QuestionDisplay q={currentQ} />
          </div>

          {/* Input area */}
          {!submitted && (
            <div className="mt-4">
              {currentQ.type === 'fractions_addition' && (
                <div className="grid grid-cols-2 gap-3">
                  {currentQ.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleSubmit(opt)}
                      className="border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl py-3 text-lg font-semibold text-gray-700 transition-colors"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {currentQ.type === 'division_decimale' && (
                <div className="flex gap-2 items-center">
                  <input
                    autoFocus
                    type="text"
                    inputMode="decimal"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="Ta réponse (ex: 3,75)"
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={() => handleSubmit()}
                    disabled={!answer}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
                  >
                    OK
                  </button>
                </div>
              )}

              {currentQ.type === 'fractions_multiplication' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 text-center">
                    Donne ta réponse sous forme simplifiée
                  </p>
                  <div className="flex items-center gap-3 justify-center">
                    <input
                      autoFocus
                      type="number"
                      value={fracNum}
                      onChange={(e) => setFracNum(e.target.value)}
                      placeholder="num."
                      className="w-20 px-3 py-2 border-2 border-gray-200 rounded-xl text-lg text-center focus:outline-none focus:border-indigo-400"
                    />
                    <span className="text-2xl font-bold text-gray-600">—</span>
                    <input
                      type="number"
                      value={fracDen}
                      onChange={(e) => setFracDen(e.target.value)}
                      placeholder="dén."
                      className="w-20 px-3 py-2 border-2 border-gray-200 rounded-xl text-lg text-center focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      onClick={() => handleSubmit()}
                      disabled={!fracNum || !fracDen}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
                    >
                      OK
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feedback */}
          {submitted && (
            <div
              className={`mt-4 rounded-xl px-4 py-3 ${
                isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}
            >
              <p className={`font-semibold text-lg ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                {isCorrect ? '✓ Correct !' : `✗ La bonne réponse était : ${getCorrectAnswer(currentQ)}`}
              </p>
              <p className="text-sm text-gray-600 mt-1 font-mono">{getExplanation(currentQ)}</p>
            </div>
          )}
        </div>

        {submitted && (
          <button
            onClick={nextQuestion}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {currentIdx + 1 < TOTAL ? 'Question suivante →' : 'Voir les résultats'}
          </button>
        )}

        {/* Running score */}
        <p className="text-center text-sm text-gray-400 mt-4">
          Score actuel : {score} / {currentIdx + (submitted ? 1 : 0)}
        </p>
      </div>
    </div>
  )
}
