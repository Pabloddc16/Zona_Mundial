import { z } from 'zod'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  totp: z.string().length(6).optional(),
})

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

export const RequestResetSchema = z.object({
  email: z.string().email(),
})

// ─── Users ────────────────────────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(8),
  role: z.enum(['admin', 'repartidor', 'capturista']),
  email: z.string().email().optional(),
})

export const UpdateUserSchema = CreateUserSchema.partial().omit({ password: true })

// ─── Products ─────────────────────────────────────────────────────────────────

export const CreateProductSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  emoji: z.string().optional(),
  image_url: z.string().url().optional(),
  price: z.number().nonnegative(),
  cost: z.number().nonnegative().optional(),
  stock: z.number().int().nonnegative().default(0),
  supplier: z.string().optional(),
  barcode: z.string().optional(),
  clave_prod_serv: z.string().optional(),
  clave_unidad: z.string().optional(),
})

export const UpdateProductSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  emoji: z.string().optional(),
  image_url: z.string().url().optional().nullable(),
  price: z.number().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
  barcode: z.string().optional(),
  supplier: z.string().optional(),
  clave_prod_serv: z.string().optional(),
  clave_unidad: z.string().optional(),
})

export const StockAdjustmentSchema = z.object({
  delta: z.number().int(),
  reason: z.string().min(1),
  note: z.string().optional(),
})

// ─── Orders ───────────────────────────────────────────────────────────────────

export const OrderItemSchema = z.object({
  product_id: z.string().optional(),
  name: z.string().min(1),
  qty: z.number().int().positive(),
  price: z.number().nonnegative(),
  cost_at_sale: z.number().nonnegative().optional(),
})

export const CreateOrderSchema = z.object({
  customer_id: z.string().optional(),
  customer_name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  payment_method: z.string().optional(),
  delivery_type: z.enum(['local', 'envio']).default('local'),
  shipping: z.number().nonnegative().default(0),
  notes: z.string().optional(),
  items: z.array(OrderItemSchema).min(1),
})

export const UpdateOrderSchema = z.object({
  status: z.enum(['CREATED', 'ASSIGNED', 'IN_ROUTE', 'DELIVERED', 'CANCELLED']).optional(),
  deliverer_id: z.string().optional(),
  shipping_guide: z.string().optional(),
  notes: z.string().optional(),
})

// ─── POS Sales ────────────────────────────────────────────────────────────────

export const SaleItemSchema = z.object({
  product_id: z.string().optional(),
  name: z.string().min(1),
  emoji: z.string().optional(),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
  cost_at_sale: z.number().nonnegative().optional(),
  total_amount: z.number().nonnegative().optional(),
  mode: z.enum(['unit', 'total']).default('unit'),
})

export const CreateSaleSchema = z.object({
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  payment_method: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(SaleItemSchema).min(1),
})

// ─── Wholesale ────────────────────────────────────────────────────────────────

export const CreateWholesalerSchema = z.object({
  razon_social: z.string().min(1),
  rfc: z.string().optional(),
  email: z.string().email().optional(),
  contacto: z.string().optional(),
  nota: z.string().optional(),
  regimen_fiscal: z.string().optional(),
  uso_cfdi: z.string().optional(),
  codigo_postal: z.string().optional(),
})

export const WholesaleItemSchema = z.object({
  product_id: z.string().optional(),
  name: z.string().min(1),
  emoji: z.string().optional(),
  quantity: z.number().int().positive(),
  unit_price: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
  cost_at_sale: z.number().nonnegative().optional(),
})

export const CreateWholesaleSaleSchema = z.object({
  wholesaler_id: z.string().optional(),
  wholesaler_name: z.string().min(1),
  payment_method: z.string().optional(),
  discount_type: z.enum(['percent', 'fixed']).optional(),
  discount_value: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  items: z.array(WholesaleItemSchema).min(1),
})

export const RecordPaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.string().min(1),
  date: z.string().optional(),
  notes: z.string().optional(),
})

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const CreateExpenseSchema = z.object({
  date: z.string().min(1),
  concept: z.string().min(1),
  category: z.string().optional(),
  amount: z.number().positive(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
})

export const UpdateExpenseSchema = CreateExpenseSchema.partial()

// ─── Returns ─────────────────────────────────────────────────────────────────

export const ReturnItemSchema = z.object({
  product_id: z.string().optional(),
  name: z.string().min(1),
  qty: z.number().positive(),
  unit_price: z.number().nonnegative().optional(),
  subtotal: z.number().nonnegative().optional(),
})

export const CreateReturnSchema = z.object({
  original_id: z.string().min(1),
  source: z.enum(['pos', 'wholesale', 'app']),
  reason: z.string().min(1),
  refund_method: z.string().min(1),
  refund_amount: z.number().nonnegative(),
  items: z.array(ReturnItemSchema).min(1),
})

// ─── Customers ───────────────────────────────────────────────────────────────

export const CreateCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
})

export const UpdateCustomerSchema = CreateCustomerSchema.partial()

// ─── Deliverers ───────────────────────────────────────────────────────────────

export const CreateDelivererSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  username: z.string().min(3).optional(),
  vehicle: z.string().optional(),
  plate: z.string().optional(),
  zone: z.string().optional(),
})

export const UpdateDelivererSchema = z.object({
  status: z.enum(['DISPONIBLE', 'EN_RUTA', 'DESCANSO']).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  rating: z.number().min(0).max(5).optional(),
  current_order: z.string().optional(),
})

// ─── Consumer app — checkout (ported from Mundial2026/server/schemas.js) ──────

export const CheckoutItemSchema = z.object({
  title: z.string().min(1).max(256),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
})

export const CheckoutUserSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email().optional(),
  address: z.string().min(3),
  city: z.string().optional(),
})

export const CheckoutSchema = z.object({
  items: z.array(CheckoutItemSchema).min(1),
  user: CheckoutUserSchema,
  delivery: z.enum(['pickup', 'gdl', 'nacional']).optional(),
  referralCode: z.string().trim().toUpperCase().min(2).max(24).optional(),
})

// ─── Pagination ───────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(25),
  offset: z.coerce.number().int().min(0).default(0),
})

// ─── Inferred types ───────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof LoginSchema>
export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
export type CreateSaleInput = z.infer<typeof CreateSaleSchema>
export type CreateWholesaleSaleInput = z.infer<typeof CreateWholesaleSaleSchema>
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>
export type CreateReturnInput = z.infer<typeof CreateReturnSchema>
export type CheckoutInput = z.infer<typeof CheckoutSchema>
export type PaginationInput = z.infer<typeof PaginationSchema>
