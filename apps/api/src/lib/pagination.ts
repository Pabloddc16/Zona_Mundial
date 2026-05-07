export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 500

export interface PaginationQuery {
  page?: string | number
  limit?: string | number
  q?: string
  sort?: string
}

export interface PaginationOptions<T> {
  searchFields?: (keyof T & string)[] | null
  defaultSort?: SortSpec | null
}

export interface SortSpec {
  field: string
  dir: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pages: number
  limit: number
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  const i = Math.floor(n)
  return Math.min(Math.max(i, min), max)
}

export function parseSort(input: string | undefined | null): SortSpec | null {
  if (!input) return null
  const [rawField, rawDir] = String(input).split(':')
  const field = rawField?.trim()
  if (!field) return null
  const dir = (rawDir ?? 'asc').trim().toLowerCase() === 'desc' ? 'desc' : 'asc'
  return { field, dir }
}

function getNested(obj: Record<string, unknown>, field: string): unknown {
  if (!obj) return undefined
  if (!field.includes('.')) return obj[field]
  return field.split('.').reduce<unknown>((acc, k) => {
    if (acc == null || typeof acc !== 'object') return undefined
    return (acc as Record<string, unknown>)[k]
  }, obj)
}

export function filterByQuery<T extends Record<string, unknown>>(
  list: T[],
  q: string | undefined,
  searchFields: string[] | null = null,
): T[] {
  if (!q?.trim()) return list
  const needle = q.trim().toLowerCase()
  return list.filter((row) => {
    if (!row || typeof row !== 'object') return false
    const fields = searchFields ?? Object.keys(row)
    for (const f of fields) {
      const v = getNested(row, f)
      if (v == null) continue
      const s = typeof v === 'string' ? v : typeof v === 'number' ? String(v) : null
      if (s?.toLowerCase().includes(needle)) return true
    }
    return false
  })
}

export function sortList<T extends Record<string, unknown>>(list: T[], sort: SortSpec | null): T[] {
  if (!sort) return list
  const { field, dir } = sort
  const mul = dir === 'desc' ? -1 : 1
  return list.slice().sort((a, b) => {
    const av = getNested(a, field)
    const bv = getNested(b, field)
    if (av == null && bv == null) return 0
    if (av == null) return -1 * mul
    if (bv == null) return 1 * mul
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mul
    return String(av).localeCompare(String(bv)) * mul
  })
}

export function paginate<T extends Record<string, unknown>>(
  list: T[],
  query: PaginationQuery,
  options: PaginationOptions<T> = {},
): PaginatedResult<T> {
  const { searchFields = null, defaultSort = null } = options
  const page = clampInt(query.page, 1, 1, Number.MAX_SAFE_INTEGER)
  const limit = clampInt(query.limit, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE)
  const sort = parseSort(query.sort ?? undefined) ?? defaultSort
  const filtered = filterByQuery(list, query.q, searchFields as string[] | null)
  const sorted = sortList(filtered, sort)
  const total = sorted.length
  const pages = Math.max(1, Math.ceil(total / limit))
  const safePage = Math.min(page, pages)
  const start = (safePage - 1) * limit
  const items = sorted.slice(start, start + limit)
  return { items, total, page: safePage, pages, limit }
}
