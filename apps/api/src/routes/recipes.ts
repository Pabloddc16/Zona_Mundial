import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'
import { randomUUID } from 'crypto'

const recipesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: fastify.authenticate }, async () => {
    const sb = getClient()
    const { data: recipes, error } = await sb
      .from('recipes')
      .select('*, output_product:products!output_sku_id(name, sku), recipe_lines(*, input_product:products!input_sku_id(name, sku))')
      .order('name')
    if (error) throw new Error(error.message)
    return recipes
  })

  fastify.post('/', { preHandler: fastify.authenticate }, async (req, reply) => {
    const body = req.body as { name?: string; output_sku_id?: string; output_qty?: number; lines?: { input_sku_id: string; input_qty: number }[] }
    if (!body.name || !body.output_sku_id) return reply.badRequest('name y output_sku_id requeridos')
    const sb = getClient()
    const recipeId = `recipe_${randomUUID().slice(0, 8)}`
    const { data, error } = await sb.from('recipes').insert({ id: recipeId, name: body.name, output_sku_id: body.output_sku_id, output_qty: body.output_qty ?? 1 }).select().single()
    if (error) throw new Error(error.message)
    if (body.lines?.length) {
      const lineRows = body.lines.map((l, i) => ({ id: `rl_${randomUUID().slice(0, 8)}_${i}`, recipe_id: recipeId, input_sku_id: l.input_sku_id, input_qty: l.input_qty }))
      await sb.from('recipe_lines').insert(lineRows)
    }
    return reply.code(201).send(data)
  })

  fastify.patch('/:id', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = req.body as Record<string, unknown>
    const allowed = ['name', 'output_qty', 'active']
    const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))
    const { data, error } = await getClient().from('recipes').update(update).eq('id', id).select().single()
    if (error) return reply.notFound()
    return data
  })

  fastify.delete('/:id', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { error } = await getClient().from('recipes').delete().eq('id', id)
    if (error) return reply.notFound()
    return { ok: true }
  })
}

export default recipesRoutes
