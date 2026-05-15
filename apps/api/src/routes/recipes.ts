import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'
import { randomUUID } from 'crypto'

const recipesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { preHandler: fastify.authenticate }, async () => {
    const sb = getClient()
    // Manual join because PostgREST nested embeds sometimes return empty arrays
    // for recipe_lines even when rows exist (FK introspection inconsistency).
    const { data: recipes, error } = await sb.from('recipes').select('*').order('name')
    if (error) throw new Error(error.message)
    const recipeRows = recipes ?? []
    if (recipeRows.length === 0) return []

    const recipeIds = recipeRows.map((r) => r.id as string)
    const { data: lines } = await sb.from('recipe_lines').select('*').in('recipe_id', recipeIds)
    const lineRows = (lines ?? []) as Array<{ id: string; recipe_id: string; input_sku_id: string; input_qty: number }>

    const outputSkuIds = [...new Set(recipeRows.map((r) => r.output_sku_id as string))]
    const inputSkuIds = [...new Set(lineRows.map((l) => l.input_sku_id))]
    const allSkuIds = [...new Set([...outputSkuIds, ...inputSkuIds])]

    const { data: products } = allSkuIds.length
      ? await sb.from('products').select('id, name, sku').in('id', allSkuIds)
      : { data: [] }
    const productById = new Map((products ?? []).map((p) => [p.id, p]))

    const linesByRecipe = new Map<string, typeof lineRows>()
    for (const l of lineRows) {
      const arr = linesByRecipe.get(l.recipe_id) ?? []
      arr.push(l)
      linesByRecipe.set(l.recipe_id, arr)
    }

    return recipeRows.map((r) => ({
      ...r,
      output_product: productById.get(r.output_sku_id as string) ?? null,
      lines: (linesByRecipe.get(r.id as string) ?? []).map((l) => ({
        ...l,
        input_product: productById.get(l.input_sku_id) ?? null,
      })),
      recipe_lines: linesByRecipe.get(r.id as string) ?? [],
    }))
  })

  fastify.post('/', { preHandler: fastify.authenticate }, async (req, reply) => {
    const body = req.body as { name?: string; output_sku_id?: string; output_qty?: number; lines?: { input_sku_id: string; input_qty: number }[] }
    if (!body.name || !body.output_sku_id) return reply.badRequest('name and output_sku_id required')
    if (!body.lines?.length) return reply.badRequest('At least one ingredient line is required')

    const sb = getClient()
    const recipeId = `recipe_${randomUUID().slice(0, 8)}`

    const { data, error } = await sb
      .from('recipes')
      .insert({ id: recipeId, name: body.name, output_sku_id: body.output_sku_id, output_qty: body.output_qty ?? 1 })
      .select()
      .single()
    if (error) {
      req.log.warn({ err: error.message, step: 'recipes.insert' }, 'recipe create failed')
      return reply.badRequest(error.message)
    }

    const lineRows = body.lines.map((l, i) => ({
      id: `rl_${randomUUID().slice(0, 8)}_${i}`,
      recipe_id: recipeId,
      input_sku_id: l.input_sku_id,
      input_qty: Number(l.input_qty),
    }))
    const { error: linesErr } = await sb.from('recipe_lines').insert(lineRows)
    if (linesErr) {
      // Roll back the recipe row so we don't leave a 0-line orphan
      await sb.from('recipes').delete().eq('id', recipeId)
      req.log.warn({ err: linesErr.message, lineRows, step: 'recipe_lines.insert' }, 'recipe lines insert failed')
      return reply.badRequest(`Recipe ingredients couldn't be saved: ${linesErr.message}`)
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
