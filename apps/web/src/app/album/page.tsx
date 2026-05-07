'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ALBUM, TOTAL_STICKERS } from '@/lib/data'
import { useAlbumStore, albumStats } from '@/lib/album-store'
import { cn } from '@/lib/cn'

const TABS = ['Todo', 'Me falta', 'Tengo extra'] as const
type Tab = typeof TABS[number]

export default function AlbumPage() {
  const [tab, setTab] = useState<Tab>('Todo')
  const album = useAlbumStore((s) => s.album)
  const stats = albumStats(album)

  const pct = Math.round((stats.owned / TOTAL_STICKERS) * 100)

  const filteredGroups = ALBUM.filter((g) => {
    if (tab === 'Todo') return true
    if (tab === 'Me falta') return g.stickers.some((s) => !((album[g.id]?.[s.n]?.owned ?? 0) > 0))
    if (tab === 'Tengo extra') return g.stickers.some((s) => (album[g.id]?.[s.n]?.owned ?? 0) > 1)
    return true
  })

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-tinta">Mi Álbum</h1>
        <p className="text-sm text-gray-500 mt-0.5">{stats.owned} / {TOTAL_STICKERS} estampas</p>
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-verde rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{pct}% completado</span>
          <span>{stats.needed} buscadas · {stats.extras} extras</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn('flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors', tab === t ? 'bg-white shadow text-tinta' : 'text-gray-500')}>
            {t}
          </button>
        ))}
      </div>

      {/* Group grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredGroups.map((g) => {
          const groupState = album[g.id] ?? {}
          const ownedCount = g.stickers.filter((s) => (groupState[s.n]?.owned ?? 0) > 0).length
          const total = g.stickers.length
          const gPct = Math.round((ownedCount / total) * 100)
          const complete = ownedCount === total

          return (
            <Link key={g.id} href={`/album/${g.id}`} className={cn('rounded-2xl p-4 border-2 transition-all active:scale-95', complete ? 'border-verde bg-verde/5' : 'border-gray-200 bg-white')}>
              <div className="text-3xl mb-2">{g.emoji}</div>
              <div className="font-semibold text-sm text-tinta leading-tight">{g.name}</div>
              <div className="text-xs text-gray-400 mb-2">{g.subtitle}</div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-verde rounded-full" style={{ width: `${gPct}%` }} />
              </div>
              <div className="text-xs text-gray-500 mt-1">{ownedCount}/{total}</div>
            </Link>
          )
        })}
      </div>

      <div className="h-4" />
    </div>
  )
}
