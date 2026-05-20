'use client'
/**
 * /admin/stars-inventory — physical stock grid for Stars SKUs.
 * Cells: 20 players × 4 rarity tiers = 80 cells.
 * Each cell shows count, MXN value, low-stock badge if < 3.
 *
 * Current implementation: read-only with initial values from spec.
 * TODO: wire to Supabase `star_player_stock` table for live edits.
 */
import { useMemo, useState } from 'react'
import {
  STAR_PLAYERS,
  STAR_RARITIES,
  STAR_PRICING,
  INITIAL_STOCK,
  STAR_TIERS,
  type StarTier,
  type StarRarity,
} from '@/lib/star-inventory'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

type Filter = 'all' | StarTier | StarRarity

export default function StarsInventoryPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    return STAR_PLAYERS
      .filter((p) => {
        if (filter !== 'all' && STAR_TIERS.includes(filter as StarTier) && p.tier !== filter) return false
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
        return true
      })
      .map((p) => {
        const stock = INITIAL_STOCK[p.slug] ?? [0, 0, 0, 0]
        const cells = STAR_RARITIES.map((r, i) => ({
          rarity: r,
          count: stock[i] ?? 0,
          price: STAR_PRICING[p.tier][r],
          value: (stock[i] ?? 0) * STAR_PRICING[p.tier][r],
        }))
        const total = cells.reduce((sum, c) => sum + c.value, 0)
        return { ...p, cells, total }
      })
  }, [filter, search])

  const totals = useMemo(() => {
    const units: Record<StarRarity, number> = { BASE: 0, BRONCE: 0, PLATA: 0, ORO: 0 }
    let totalValue = 0
    for (const r of rows) {
      for (const c of r.cells) {
        units[c.rarity] += c.count
        totalValue += c.value
      }
    }
    return { units, totalValue, total: Object.values(units).reduce((a, b) => a + b, 0) }
  }, [rows])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-end justify-between gap-4 border-b border-white/8 pb-5">
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.28em] text-[oklch(0.77_0.163_70)]">
            · Inventory · Stars SKUs
          </p>
          <h1 className="text-[clamp(1.6rem,3vw,2.5rem)] font-black leading-[0.95] tracking-tight text-white">
            Stock físico · <em className="italic text-[oklch(0.84_0.150_80)]">{totals.total} unidades</em>
          </h1>
          <p className="mt-1 text-sm text-white/50">Valor total: <span className="font-bold text-white">{fmt(totals.totalValue)}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar jugador..."
            className="rounded-full px-4 py-2 text-sm font-medium"
            style={{ background: 'oklch(0.24 0.012 260)', border: '1px solid oklch(1 0 0 / 0.12)', color: 'white' }}
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...STAR_TIERS] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              filter === f
                ? 'bg-[oklch(0.77_0.163_70)] text-[#0B1F15]'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {f === 'all' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {/* Inventory grid */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'oklch(0.245 0.010 260)', border: '1px solid oklch(1 0 0 / 0.08)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'oklch(0.20 0.010 260)' }}>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white/50">Jugador</th>
              <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-white/50">Tier</th>
              {STAR_RARITIES.map((r) => (
                <th key={r} className="text-right px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-white/50">{r}</th>
              ))}
              <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[oklch(0.77_0.163_70)]">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.slug} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-bold text-white">{p.name} <span className="text-white/40 font-normal text-xs">({p.country})</span></td>
                <td className="px-3 py-3">
                  <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-black tracking-widest ${
                    p.tier === 'GOAT' ? 'bg-[oklch(0.84_0.150_80)] text-[#0B1F15]'
                    : p.tier === 'CRACK' ? 'bg-[#0B1F15] text-[oklch(0.84_0.150_80)] border border-[oklch(0.84_0.150_80)]'
                    : 'bg-[oklch(0.40_0.07_145)] text-white'
                  }`}>{p.tier}</span>
                </td>
                {p.cells.map((c) => (
                  <td key={c.rarity} className="px-3 py-3 text-right tabular-nums">
                    <span className={c.count === 0 ? 'text-white/20 line-through' : c.count < 3 ? 'text-[oklch(0.75_0.18_27)] font-bold' : 'text-white font-bold'}>
                      {c.count}
                    </span>
                    <span className="block text-[10px] text-white/40">{fmt(c.price)}</span>
                  </td>
                ))}
                <td className="px-4 py-3 text-right tabular-nums font-black text-[oklch(0.77_0.163_70)]">{fmt(p.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'oklch(0.20 0.010 260)' }} className="border-t-2 border-white/10">
              <td colSpan={2} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white/50">Total</td>
              {STAR_RARITIES.map((r) => (
                <td key={r} className="px-3 py-3 text-right tabular-nums font-bold text-white">
                  {totals.units[r]}
                </td>
              ))}
              <td className="px-4 py-3 text-right tabular-nums font-black text-[oklch(0.77_0.163_70)]">{fmt(totals.totalValue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-white/40">
        Read-only por ahora. Conexión live a la tabla <code className="font-mono text-white/60">star_player_stock</code> pendiente — bulk edit + CSV export en sprint siguiente.
      </p>
    </div>
  )
}
