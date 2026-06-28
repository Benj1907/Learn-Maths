import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  // Verify caller is parent
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'parent') {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  const body = await request.json()
  const { displayName, email, password } = body as {
    displayName: string
    email: string
    password: string
  }

  if (!displayName || !email || !password) {
    return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Create auth user
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName,
      role: 'child',
    },
  })

  if (createError || !newUser.user) {
    return NextResponse.json(
      { error: createError?.message ?? 'Impossible de créer le compte.' },
      { status: 500 }
    )
  }

  // Update the profile to set parent_id (trigger created it without parent_id)
  const { error: profileError } = await admin
    .from('profiles')
    .update({ parent_id: user.id })
    .eq('id', newUser.user.id)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
