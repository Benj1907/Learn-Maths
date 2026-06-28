import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Topic } from '@/types'
import { TOPIC_LABELS } from '@/types'

const TOPICS: Topic[] = ['division_decimale', 'fractions_addition', 'fractions_multiplication']

function starsForPct(pct: number): string {
  if (pct >= 80) return '⭐⭐⭐'
  if (pct >= 60) return '⭐⭐☆'
  if (pct >= 40) return '⭐☆☆'
  return '☆☆☆'
}

export default async function ParentDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: parentProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  // Children of this parent
  const { data: children } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('parent_id', user.id)

  // Attempts for all children
  const childIds = (children ?? []).map((c) => c.id)

  const { data: attempts } = childIds.length
    ? await supabase
        .from('exercise_attempts')
        .select('user_id, topic, is_correct, attempted_at, user_answer, correct_answer')
        .in('user_id', childIds)
        .order('attempted_at', { ascending: false })
        .limit(200)
    : { data: [] }

  async function logout() {
    'use server'
    const { createClient: createServerClient } = await import('@/lib/supabase/server')
    const sb = await createServerClient()
    await sb.auth.signOut()
    redirect('/login')
  }

  const attemptsArr = attempts ?? []

  // Aggregate per child per topic
  type ChildStats = Record<string, Record<Topic, { total: number; correct: number }>>
  const stats: ChildStats = {}
  for (const child of children ?? []) {
    stats[child.id] = {
      division_decimale: { total: 0, correct: 0 },
      fractions_addition: { total: 0, correct: 0 },
      fractions_multiplication: { total: 0, correct: 0 },
    }
  }
  for (const a of attemptsArr) {
    const childStat = stats[a.user_id]
    if (childStat && TOPICS.includes(a.topic as Topic)) {
      childStat[a.topic as Topic].total++
      if (a.is_correct) childStat[a.topic as Topic].correct++
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Tableau de bord
            </h1>
            <p className="text-gray-500 mt-0.5">
              Bonjour {parentProfile?.display_name ?? ''} 👋
            </p>
          </div>
          <form action={logout}>
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-700 underline">
              Déconnexion
            </button>
          </form>
        </div>

        {/* Children */}
        {(children ?? []).length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-500">
            <p className="mb-4">Aucun enfant ajouté pour l'instant.</p>
            <Link
              href="/parent/add-child"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl inline-block"
            >
              + Ajouter un enfant
            </Link>
          </div>
        ) : (
          <>
            {(children ?? []).map((child) => {
              const childStats = stats[child.id]
              return (
                <div key={child.id} className="bg-white rounded-2xl shadow p-6 mb-4">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    {child.display_name}
                  </h2>
                  <div className="grid grid-cols-3 gap-3">
                    {TOPICS.map((topic) => {
                      const { total, correct } = childStats[topic]
                      const pct = total > 0 ? Math.round((correct / total) * 100) : -1
                      return (
                        <div key={topic} className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-500 leading-tight mb-1">
                            {TOPIC_LABELS[topic]}
                          </p>
                          {pct >= 0 ? (
                            <>
                              <p className="text-2xl font-bold text-indigo-600">{pct}%</p>
                              <p className="text-base">{starsForPct(pct)}</p>
                              <p className="text-xs text-gray-400">{correct}/{total}</p>
                            </>
                          ) : (
                            <p className="text-sm text-gray-400 py-1">Pas encore commencé</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            <Link
              href="/parent/add-child"
              className="block text-center text-indigo-600 hover:text-indigo-700 font-medium mb-8"
            >
              + Ajouter un enfant
            </Link>
          </>
        )}

        {/* Recent attempts */}
        {attemptsArr.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Derniers exercices</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b">
                    <th className="pb-2 font-medium">Enfant</th>
                    <th className="pb-2 font-medium">Thème</th>
                    <th className="pb-2 font-medium">Réponse</th>
                    <th className="pb-2 font-medium">Correct</th>
                    <th className="pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {attemptsArr.slice(0, 20).map((a, i) => {
                    const child = (children ?? []).find((c) => c.id === a.user_id)
                    const d = new Date(a.attempted_at)
                    const dateStr = d.toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    return (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium text-gray-700">
                          {child?.display_name ?? '—'}
                        </td>
                        <td className="py-2 pr-3 text-gray-500 text-xs">
                          {TOPIC_LABELS[a.topic as Topic] ?? a.topic}
                        </td>
                        <td className="py-2 pr-3 font-mono text-gray-600">
                          {a.user_answer}
                        </td>
                        <td className="py-2 pr-3">
                          {a.is_correct ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-red-500">✗ ({a.correct_answer})</span>
                          )}
                        </td>
                        <td className="py-2 text-gray-400 text-xs">{dateStr}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
