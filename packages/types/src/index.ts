// ─── Core domain types derived from db/schema.sql ───────────────────────────

export type UserRole = 'admin' | 'repartidor' | 'capturista'

export interface User {
  id: string
  username: string
  password_hash: string
  role: UserRole
  email?: string
  totp_secret?: string
  totp_enabled: boolean
  active: boolean
  last_login_at?: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  category?: string
  emoji?: string
  price: number
  cost?: number
  stock: number
  supplier?: string
  barcode?: string
  clave_prod_serv?: string
  clave_unidad?: string
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  member_since?: string
  total_orders: number
  total_spent: number
  created_at: string
}

export type DelivererStatus = 'DISPONIBLE' | 'EN_RUTA' | 'DESCANSO'

export interface Deliverer {
  id: string
  name: string
  phone?: string
  username?: string
  vehicle?: string
  plate?: string
  zone?: string
  status: DelivererStatus
  rating?: number
  deliveries_today: number
  deliveries_total: number
  current_order?: string
  lat?: number
  lng?: number
  created_at: string
}

export interface Wholesaler {
  id: string
  razon_social: string
  rfc?: string
  email?: string
  contacto?: string
  nota?: string
  regimen_fiscal?: string
  uso_cfdi?: string
  codigo_postal?: string
  active: boolean
  created_at: string
}

export type OrderStatus = 'CREATED' | 'ASSIGNED' | 'IN_ROUTE' | 'DELIVERED' | 'CANCELLED'
export type DeliveryType = 'local' | 'envio'

export interface Order {
  order_number: string
  customer_id?: string
  customer_name?: string
  phone?: string
  address?: string
  date?: string
  status: OrderStatus
  payment_method?: string
  delivery_type: DeliveryType
  shipping_guide?: string
  deliverer_id?: string
  subtotal: number
  shipping: number
  total: number
  notes?: string
  deleted: boolean
  deleted_at?: string
  deleted_by?: string
  updated_at?: string
  updated_by?: string
  created_at: string
  items?: OrderItem[]
}

export interface OrderItem {
  id: number
  order_number: string
  product_id?: string
  name?: string
  qty: number
  price: number
  cost_at_sale?: number
  position: number
}

export interface Sale {
  id: string
  customer_name?: string
  customer_phone?: string
  payment_method?: string
  notes?: string
  total: number
  created_by?: string
  created_at: string
  items?: SaleItem[]
}

export type SaleMode = 'unit' | 'total'

export interface SaleItem {
  id: number
  sale_id: string
  product_id?: string
  name?: string
  emoji?: string
  quantity: number
  unit_price: number
  subtotal: number
  cost_at_sale?: number
  total_amount?: number
  mode: SaleMode
  position: number
}

export type WholesaleSaleStatus = 'pagado' | 'pendiente_credito' | 'parcial' | 'cancelled'
export type DiscountType = 'percent' | 'fixed'

export interface WholesaleSale {
  id: string
  wholesaler_id?: string
  wholesaler_name?: string
  payment_method?: string
  status: WholesaleSaleStatus
  subtotal: number
  discount_type?: DiscountType
  discount_value?: number
  discount_amount?: number
  total: number
  amount_paid: number
  notes?: string
  created_by?: string
  created_at: string
  items?: WholesaleSaleItem[]
  payments?: WholesalePayment[]
}

export interface WholesaleSaleItem {
  id: number
  sale_id: string
  product_id?: string
  name?: string
  emoji?: string
  quantity: number
  unit_price: number
  subtotal: number
  cost_at_sale?: number
  position: number
}

export interface WholesalePayment {
  id: number
  sale_id: string
  amount: number
  method?: string
  date?: string
  notes?: string
  created_at: string
}

export interface Expense {
  id: string
  date: string
  concept: string
  category?: string
  amount: number
  payment_method?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at?: string
  updated_by?: string
}

export type ReturnSource = 'pos' | 'wholesale' | 'app'

export interface Return {
  id: string
  original_id: string
  source: ReturnSource
  reason?: string
  refund_method?: string
  refund_amount?: number
  created_by?: string
  created_at: string
  items?: ReturnItem[]
}

export interface ReturnItem {
  id: number
  return_id: string
  product_id?: string
  name?: string
  qty: number
  unit_price?: number
  subtotal?: number
}

export type InvoiceSource = 'pos' | 'wholesale'
export type InvoiceStatus = 'pending' | 'issued' | 'cancelled'

export interface Invoice {
  id: string
  source: InvoiceSource
  source_id: string
  uuid?: string
  status: InvoiceStatus
  total?: number
  pdf_url?: string
  xml_url?: string
  receptor_rfc?: string
  receptor_name?: string
  cancelled_at?: string
  created_at: string
}

export interface StockAdjustment {
  id: string
  product_id: string
  delta: number
  previous_stock?: number
  new_stock?: number
  reason?: string
  note?: string
  created_by?: string
  created_at: string
}

export interface AuditEntry {
  id: string
  ts: string
  user?: string
  role?: string
  method?: string
  path?: string
  status?: number
  action?: string
  resource?: string
  resource_id?: string
  before_data?: Record<string, unknown>
  after_data?: Record<string, unknown>
  body?: Record<string, unknown>
  reversible?: boolean
  reverted: boolean
  reverted_at?: string
  reverted_by?: string
  reverted_audit_id?: string
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardKPIs {
  revenue_today: number
  orders_today: number
  orders_by_status: Record<OrderStatus, number>
  top_products: Array<{ id: string; name: string; qty: number; revenue: number }>
  deliverers_available: number
}

// ─── Sticker catalog (consumer app) ──────────────────────────────────────────

export type StickerTier = 'comun' | 'media' | 'dificil'
export type StickerType = 'logo' | 'team' | 'player' | 'special'

export interface Sticker {
  code: string
  label: string
  type: StickerType
  tier: StickerTier
  group: string
  rarity?: number
}

export interface StickerGroup {
  id: string
  name: string
  flag?: string
  stickers: Sticker[]
}

export interface AlbumState {
  [stickerCode: string]: {
    owned: number
    forSwap: boolean
  }
}
