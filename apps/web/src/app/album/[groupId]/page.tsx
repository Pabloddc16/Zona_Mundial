'use client'
import { use } from 'react'
import Link from 'next/link'
import { groupById, PRICE_BY_TIER, fmt } from '@/lib/data'
import { useAlbumStore } from '@/lib/album-store'
import { useCartStore } from '@/lib/cart-store'
import { cn } from '@/lib/cn'

export default function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params)
  const group = groupById(groupId)
  const album = useAlbumStore((s) => s.album)
  const markOwned = useAlbumStore((s) => s.markOwned)
  const markNeeded = useAlbumStore((s) => s.markNeeded)
  const addToCart = useCartStore((s) => s.add)

  if (!group) return <div className="p-8 text-center text-gray-400">Sección no encontrada</div>

  const groupState = album[groupId] ?? {}

  function handleSticker(n: number, action: 'owned' | 'needed') {
    const delta = action === 'owned'
      ? ((groupState[n]?.owned ?? 0) > 0 ? -1 : 1)
      : ((groupState[n]?.needed ?? 0) > 0 ? -1 : 1)
    if (action === 'owned') markOwned(groupId, n, delta)
    else markNeeded(groupId, n, delta)
  }

  const missing = group.stickers.filter((s) => !((groupState[s.n]?.owned ?? 0) > 0))

  function addMissingToCart() {
    missing.forEach((s) => addToCart('CARTA-SUELTA', 1))
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/album" className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
          <ChevronLeft />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{group.emoji}</span>
            <h1 className="text-xl font-bold text-tinta">{group.name}</h1>
          </div>
          <p className="text-sm text-gray-400">{group.subtitle} · {group.stickers.length} estampas</p>
        </div>
      </div>

      {/* Stats bar */}
      {missing.length > 0 && (
        <div className="mb-4 flex items-center justify-between bg-rojo/5 border border-rojo/20 rounded-xl p-3">
          <p className="text-sm text-rojo font-medium">Te faltan {missing.length} estampas</p>
          <button onClick={addMissingToCart} className="text-xs bg-rojo text-white px-3 py-1.5 rounded-lg font-medium">
            Agregar al carrito
          </button>
        </div>
      )}

      {/* Sticker grid */}
      <div className="grid grid-cols-3 gap-2">
        {group.stickers.map((s) => {
          const state = groupState[s.n] ?? { owned: 0, needed: 0 }
          const owned = state.owned > 0
          const needed = state.needed > 0
          const extra = state.owned > 1

          return (
            <div key={s.n} className={cn('rounded-xl border-2 p-3 text-center transition-all', owned ? 'border-verde bg-verde/5' : needed ? 'border-dorado bg-dorado/5' : 'border-gray-200 bg-white')}>
              <div className="text-xs font-mono text-gray-400 mb-1">{s.code}</div>
              <div className="text-sm font-medium text-tinta leading-tight mb-2">{s.label}</div>
              <div className="text-xs text-gray-400 mb-2">{fmt(s.price)}</div>
              {extra && <div className="text-xs text-dorado font-bold mb-1">+{state.owned - 1} extra</div>}
              <div className="flex gap-1">
                <button
                  onClick={() => handleSticker(s.n, 'owned')}
                  className={cn('flex-1 py-1 rounded-lg text-xs font-medium transition-colors', owned ? 'bg-verde text-white' : 'bg-gray-100 text-gray-600 hover:bg-verde/10')}
                >
                  {owned ? '✓' : 'Tengo'}
                </button>
                <button
                  onClick={() => handleSticker(s.n, 'needed')}
                  className={cn('flex-1 py-1 rounded-lg text-xs font-medium transition-colors', needed ? 'bg-dorado text-tinta' : 'bg-gray-100 text-gray-600 hover:bg-dorado/10')}
                >
                  {needed ? '★' : 'Busco'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="h-4" />
    </div>
  )
}

function ChevronLeft() {
  return (
    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}
