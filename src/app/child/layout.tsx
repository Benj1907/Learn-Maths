import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SessionTimerBar } from '@/lib/session-timer'

export default async function ChildLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'child') redirect('/parent')

  return (
    <>
      <SessionTimerBar />
      {children}
    </>
  )
}
