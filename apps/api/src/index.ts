import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import sensible from '@fastify/sensible'

import { authPlugin } from './plugins/auth.js'
import { auditPlugin } from './plugins/audit.js'

import authRoutes from './routes/auth.js'
import ordersRoutes from './routes/orders.js'
import salesRoutes from './routes/sales.js'
import productsRoutes from './routes/products.js'
import customersRoutes from './routes/customers.js'
import deliverersRoutes from './routes/deliverers.js'
import wholesalersRoutes from './routes/wholesalers.js'
import expensesRoutes from './routes/expenses.js'
import returnsRoutes from './routes/returns.js'
import usersRoutes from './routes/users.js'
import dashboardRoutes from './routes/dashboard.js'
import locationsRoutes from './routes/locations.js'
import recipesRoutes from './routes/recipes.js'
import purchasesRoutes from './routes/purchases.js'
import transfersRoutes from './routes/transfers.js'
import conversionsRoutes from './routes/conversions.js'
import stockRoutes, { movementsRoutes } from './routes/stock.js'
import albumRoutes from './routes/album.js'
import tradesRoutes from './routes/trades.js'
import referralRoutes from './routes/referral.js'
import starsRoutes from './routes/stars.js'
import miPaniniRoutes from './routes/mi-panini.js'
import stripeWebhook from './routes/webhooks/stripe.js'
import mercadopagoWebhook from './routes/webhooks/mercadopago.js'
import paymentsRoutes from './routes/payments.js'

const app = Fastify({
  logger: {
    level: process.env['LOG_LEVEL'] ?? 'info',
    ...(process.env['NODE_ENV'] === 'development'
      ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
      : {}),
  },
})

await app.register(cors, {
  origin: process.env['CORS_ORIGIN']?.split(',') ?? ['http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
})

await app.register(cookie, {
  secret: process.env['SESSION_SECRET'] ?? 'dev-secret-change-in-prod',
})

await app.register(sensible)
await app.register(authPlugin)
await app.register(auditPlugin)

// Health check (no auth — for uptime monitors)
app.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }))

// Webhook routes (raw body needed for signature verification — register before body parser)
await app.register(stripeWebhook, { prefix: '/api/webhooks' })
await app.register(mercadopagoWebhook, { prefix: '/api/webhooks' })

// API routes
await app.register(authRoutes, { prefix: '/api/auth' })
await app.register(ordersRoutes, { prefix: '/api/orders' })
await app.register(salesRoutes, { prefix: '/api/sales' })
await app.register(productsRoutes, { prefix: '/api/products' })
await app.register(customersRoutes, { prefix: '/api/customers' })
await app.register(deliverersRoutes, { prefix: '/api/deliverers' })
await app.register(wholesalersRoutes, { prefix: '/api/wholesalers' })
await app.register(expensesRoutes, { prefix: '/api/expenses' })
await app.register(returnsRoutes, { prefix: '/api/returns' })
await app.register(usersRoutes, { prefix: '/api/users' })
await app.register(dashboardRoutes, { prefix: '/api/dashboard' })
await app.register(locationsRoutes, { prefix: '/api/locations' })
await app.register(recipesRoutes, { prefix: '/api/recipes' })
await app.register(purchasesRoutes, { prefix: '/api/purchases' })
await app.register(transfersRoutes, { prefix: '/api/transfers' })
await app.register(conversionsRoutes, { prefix: '/api/conversions' })
await app.register(stockRoutes, { prefix: '/api/stock' })
await app.register(movementsRoutes, { prefix: '/api/movements' })
await app.register(albumRoutes, { prefix: '/api/album' })
await app.register(tradesRoutes, { prefix: '/api/trades' })
await app.register(referralRoutes, { prefix: '/api/referral' })
await app.register(starsRoutes, { prefix: '/api/stars' })
await app.register(miPaniniRoutes, { prefix: '/api/mi-panini' })
await app.register(paymentsRoutes, { prefix: '/api/payments' })

const port = Number(process.env['PORT'] ?? 4000)
const host = process.env['HOST'] ?? '0.0.0.0'

try {
  await app.listen({ port, host })
  console.log(`API running on ${host}:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
