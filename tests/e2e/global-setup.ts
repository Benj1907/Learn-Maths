import { createClient } from '@supabase/supabase-js'
import { E2E_CHILD_EMAIL, E2E_CHILD_PASSWORD } from './test-user'

export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — is .env.local set up for local Supabase?')
  }
  if (!/127\.0\.0\.1|localhost/.test(url)) {
    throw new Error(`Refusing to run e2e setup against non-local Supabase: ${url}`)
  }

  const admin = createClient(url, serviceRoleKey)

  const { error } = await admin.auth.admin.createUser({
    email: E2E_CHILD_EMAIL,
    password: E2E_CHILD_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: 'E2E Test Child', role: 'child' },
  })

  // Idempotent: fine if a previous run already created this account.
  if (error && !error.message.toLowerCase().includes('already been registered')) {
    throw error
  }
}
