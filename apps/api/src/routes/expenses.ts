import type { FastifyPluginAsync } from 'fastify'
import { getClient } from '@pablo/db'
import { CreateExpenseSchema, UpdateExpenseSchema } from '@pablo/validators'
import { randomUUID } from 'crypto'

const VALID_EXPENSE_CATEGORIES = ['compra-inventario', 'sueldos', 'renta', 'servicios', 'transporte', 'marketing', 'impuestos', 'otros']
const VALID_PAYMENT_METHODS = ['efectivo', 'tarjeta', 'transferencia']

const expensesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/expenses
  fastify.get('/', { preHandler: fastify.authenticate }, async (req, reply) => {
    const query = req.query as Record<string, string>
    const supabase = getClient()

    let q = supabase.from('expenses').select('*').order('date', { ascending: false })
    if (query['from']) q = q.gte('date', query['from'])
    if (query['to']) q = q.lte('date', query['to'])
    if (query['category']) q = q.eq('category', query['category'])

    const { data, error } = await q
    if (error) return reply.internalServerError(error.message)

    const page = Math.max(1, Number(query['page'] ?? 1))
    const limit = Math.min(Math.max(Number(query['limit'] ?? 50), 1), 500)
    const total = data?.length ?? 0
    return { items: data?.slice((page - 1) * limit, page * limit) ?? [], total, page, pages: Math.ceil(total / limit), limit }
  })

  // POST /api/expenses
  fastify.post('/', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const parsed = CreateExpenseSchema.safeParse(req.body)
    if (!parsed.success) return reply.badRequest(parsed.error.message)

    const { category, payment_method } = parsed.data
    if (category && !VALID_EXPENSE_CATEGORIES.includes(category)) {
      return reply.badRequest(`Categoría inválida. Válidas: ${VALID_EXPENSE_CATEGORIES.join(', ')}`)
    }
    if (payment_method && !VALID_PAYMENT_METHODS.includes(payment_method)) {
      return reply.badRequest(`Método inválido. Válidos: ${VALID_PAYMENT_METHODS.join(', ')}`)
    }

    const { data, error } = await getClient().from('expenses').insert({
      id: randomUUID(),
      ...parsed.data,
      category: category ?? 'otros',
      payment_method: payment_method ?? 'efectivo',
      concept: parsed.data.concept.slice(0, 200),
      notes: (parsed.data.notes ?? '').slice(0, 500),
      created_by: req.user?.username ?? 'admin',
      created_at: new Date().toISOString(),
    }).select().single()

    if (error) return reply.internalServerError(error.message)
    reply.code(201)
    return data
  })

  // PATCH /api/expenses/:id
  fastify.patch('/:id', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = UpdateExpenseSchema.safeParse(req.body)
    if (!parsed.success) return reply.badRequest(parsed.error.message)

    const { category, payment_method } = parsed.data
    if (category && !VALID_EXPENSE_CATEGORIES.includes(category)) {
      return reply.badRequest(`Categoría inválida. Válidas: ${VALID_EXPENSE_CATEGORIES.join(', ')}`)
    }
    if (payment_method && !VALID_PAYMENT_METHODS.includes(payment_method)) {
      return reply.badRequest(`Método inválido. Válidos: ${VALID_PAYMENT_METHODS.join(', ')}`)
    }

    const supabase = getClient()
    const { data: existing } = await supabase.from('expenses').select('id').eq('id', id).single()
    if (!existing) return reply.notFound('Egreso no encontrado')

    const updates: Record<string, unknown> = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
      updated_by: req.user?.username ?? 'admin',
    }
    if (parsed.data.concept) updates['concept'] = parsed.data.concept.slice(0, 200)
    if (parsed.data.notes) updates['notes'] = parsed.data.notes.slice(0, 500)

    const { data, error } = await supabase.from('expenses').update(updates).eq('id', id).select().single()
    if (error) return reply.internalServerError(error.message)
    return data
  })

  // DELETE /api/expenses/:id
  fastify.delete('/:id', { preHandler: fastify.requireRole('admin') }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const supabase = getClient()
    const { data: existing } = await supabase.from('expenses').select('id').eq('id', id).single()
    if (!existing) return reply.notFound('Egreso no encontrado')
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) return reply.internalServerError(error.message)
    return { ok: true }
  })
}

export default expensesRoutes
