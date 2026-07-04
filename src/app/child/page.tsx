import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ChildHomeGate } from '@/components/ChildHomeGate'
import type { Topic } from '@/types'
import { TOPIC_LABELS, TOPIC_ICONS } from '@/types'

const TOPICS: Topic[] = ['division_decimale', 'fractions_addition', 'fractions_multiplication']

const TOPIC_GRADIENT: Record<Topic, string> = {
  division_decimale: 'from-blue-400 to-blue-600',
  fractions_addition: 'from-purple-400 to-purple-600',
  fractions_multiplication: 'from-pink-400 to-pink-600',
}

function starsForPct(pct: number): number {
  if (pct >= 80) return 3
  if (pct >= 60) return 2
  if (pct >= 40) return 1
  return 0
}

export default async function ChildHome() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  // Fetch recent attempts for star calculation (last 20 per topic)
  const { data: attempts } = await supabase
    .from('exercise_attempts')
    .select('topic, is_correct')
    .eq('user_id', user.id)
    .order('attempted_at', { ascending: false })
    .limit(60)

  const progressByTopic: Record<string, { total: number; correct: number }> = {}
  for (const topic of TOPICS) {
    progressByTopic[topic] = { total: 0, correct: 0 }
  }
  for (const a of attempts ?? []) {
    const t = a.topic as Topic
    if (progressByTopic[t]) {
      progressByTopic[t].total++
      if (a.is_correct) progressByTopic[t].correct++
    }
  }

  async function logout() {
    'use server'
    const { createClient: createServerClient } = await import('@/lib/supabase/server')
    const sb = await createServerClient()
    await sb.auth.signOut()
    redirect('/login')
  }

  return (
    <ChildHomeGate>
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Bonjour {profile?.display_name ?? 'toi'} ! 👋
              </h1>
              <p className="text-gray-500 mt-0.5">Quel thème veux-tu travailler ?</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Déconnexion
              </button>
            </form>
          </div>

          {/* Topic cards */}
          <div className="space-y-4">
            {TOPICS.map((topic) => {
              const { total, correct } = progressByTopic[topic]
              const pct = total > 0 ? Math.round((correct / total) * 100) : -1
              const stars = pct >= 0 ? starsForPct(pct) : -1

              return (
                <div
                  key={topic}
                  className={`bg-gradient-to-r ${TOPIC_GRADIENT[topic]} rounded-2xl p-5 text-white shadow`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{TOPIC_ICONS[topic]}</span>
                      <div>
                        <h2 className="font-semibold text-lg leading-tight">
                          {TOPIC_LABELS[topic]}
                        </h2>
                        {stars >= 0 ? (
                          <p className="text-sm text-white/80 mt-0.5">
                            {'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)} {pct}% de réussite
                          </p>
                        ) : (
                          <p className="text-sm text-white/80 mt-0.5">Pas encore commencé</p>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/child/exercise/${topic}`}
                      className="bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
                    >
                      Commencer
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-center text-gray-400 text-sm mt-10">
            Tu peux changer d&apos;exercice à tout moment tant que le temps n&apos;est pas écoulé.
          </p>
        </div>
      </div>
    </ChildHomeGate>
  )
}
