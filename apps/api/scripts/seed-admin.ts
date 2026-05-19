/**
 * Seed an admin (or any-role) user.
 *
 * Creates an auth.users row via Supabase Admin API, then upserts public.users
 * with the requested role and username. Idempotent — re-running with the same
 * email updates the password and role instead of erroring.
 *
 * Usage:
 *   pnpm --filter @pablo/api seed:admin
 *
 * Overrides via env or flags:
 *   SEED_EMAIL=foo@bar.com SEED_PASSWORD=Hunter2! SEED_ROLE=admin SEED_USERNAME=foo \
 *     pnpm --filter @pablo/api seed:admin
 *
 * Or with flags:
 *   pnpm --filter @pablo/api seed:admin --email foo@bar.com --password Hunter2! \
 *     --role admin --username foo
 */
import { getClient } from '@pablo/db'

type Role = 'admin' | 'capturista' | 'customer'

function parseArgs() {
  const args = process.argv.slice(2)
  const out: Record<string, string> = {}
  for (let i = 0; i < args.length; i += 2) {
    const k = args[i]
    const v = args[i + 1]
    if (k && k.startsWith('--') && v) out[k.slice(2)] = v
  }
  return out
}

async function main() {
  const flags = parseArgs()
  const email = flags.email || process.env.SEED_EMAIL || 'admin@cromos26.com'
  const password = flags.password || process.env.SEED_PASSWORD || 'Test1234!'
  const role = (flags.role || process.env.SEED_ROLE || 'admin') as Role
  const username = flags.username || process.env.SEED_USERNAME || 'admin'

  if (!['admin', 'capturista', 'customer'].includes(role)) {
    throw new Error(`Invalid role "${role}". Use admin | capturista | customer.`)
  }

  const sb = getClient()

  console.log(`Seeding ${role} user → ${email}`)

  // Find existing auth user by email
  let userId: string | null = null
  const { data: existing, error: listErr } = await sb.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (listErr) throw new Error(`listUsers: ${listErr.message}`)
  const found = existing.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

  if (found) {
    userId = found.id
    console.log(`  auth user exists (${userId}) — updating password + confirming email`)
    const { error: updErr } = await sb.auth.admin.updateUserById(found.id, {
      password,
      email_confirm: true,
    })
    if (updErr) throw new Error(`updateUserById: ${updErr.message}`)
  } else {
    console.log('  creating auth user...')
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createErr) throw new Error(`createUser: ${createErr.message}`)
    userId = created.user.id
    console.log(`  auth user created (${userId})`)
  }

  if (!userId) throw new Error('Could not resolve auth user id')

  // Upsert public.users mirror
  console.log('  upserting public.users row...')
  const { error: upsertErr } = await sb
    .from('users')
    .upsert(
      {
        id: userId,
        email,
        username,
        role,
      },
      { onConflict: 'id' },
    )
  if (upsertErr) throw new Error(`users upsert: ${upsertErr.message}`)

  console.log('Done.')
  console.log('')
  console.log('   Email:    ', email)
  console.log('   Password: ', password)
  console.log('   Role:     ', role)
  console.log('   Username: ', username)
  console.log('')
  console.log('Login at /admin/login (or wherever the role can sign in).')
}

main().catch((err) => {
  console.error('seed-admin failed:', err.message)
  process.exit(1)
})
