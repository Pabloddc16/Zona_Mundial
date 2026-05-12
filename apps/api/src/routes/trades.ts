import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'

type StickerRow = { user_id: string; group_id: string; sticker_n: number; owned: number; needed: number }

const tradesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/trades/matches — find users whose extras intersect with my
  // needed AND whose needed intersects with my extras. Ranked by mutual count.
  fastify.get('/matches', { preHandler: fastify.authenticate }, async (req, reply) => {
    const sb = getClient()
    const me = req.user!.id

    // Pull my album row
    const { data: mine } = await sb
      .from('album_stickers')
      .select('group_id, sticker_n, owned, needed')
      .eq('user_id', me)

    const myExtras = new Set<string>()
    const myNeeded = new Set<string>()
    for (const r of (mine ?? []) as Array<Pick<StickerRow, 'group_id' | 'sticker_n' | 'owned' | 'needed'>>) {
      const key = `${r.group_id}#${r.sticker_n}`
      if (r.owned > 1) myExtras.add(key)
      if (r.needed > 0) myNeeded.add(key)
    }

    if (myExtras.size === 0 && myNeeded.size === 0) return { matches: [] }

    // Pull everyone else's stickers where they have extras OR need
    const { data: others, error } = await sb
      .from('album_stickers')
      .select('user_id, group_id, sticker_n, owned, needed')
      .neq('user_id', me)
      .or('owned.gt.1,needed.gt.0')
    if (error) return reply.internalServerError(error.message)

    type MatchAgg = { user_id: string; theyHaveINeed: string[]; iHaveTheyNeed: string[] }
    const byUser = new Map<string, MatchAgg>()
    for (const r of (others ?? []) as StickerRow[]) {
      const key = `${r.group_id}#${r.sticker_n}`
      let agg = byUser.get(r.user_id)
      if (!agg) { agg = { user_id: r.user_id, theyHaveINeed: [], iHaveTheyNeed: [] }; byUser.set(r.user_id, agg) }
      if (r.owned > 1 && myNeeded.has(key)) agg.theyHaveINeed.push(key)
      if (r.needed > 0 && myExtras.has(key)) agg.iHaveTheyNeed.push(key)
    }

    // Resolve usernames for users with at least one mutual overlap
    const userIds = [...byUser.values()].filter((m) => m.theyHaveINeed.length > 0 && m.iHaveTheyNeed.length > 0).map((m) => m.user_id)
    if (userIds.length === 0) return { matches: [] }

    const { data: users } = await sb.from('users').select('id, username').in('id', userIds)
    const usernameById = new Map((users ?? []).map((u) => [u.id, u.username]))

    const matches = userIds
      .map((id) => {
        const m = byUser.get(id)!
        return {
          user_id: id,
          username: usernameById.get(id) ?? 'unknown',
          they_have_i_need: m.theyHaveINeed,
          i_have_they_need: m.iHaveTheyNeed,
          score: m.theyHaveINeed.length + m.iHaveTheyNeed.length,
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)

    return { matches }
  })
}

export default tradesRoutes
