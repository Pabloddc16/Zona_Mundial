'use client'
import { useAlbumStore, albumStats } from '@/lib/album-store'
import { TOTAL_STICKERS, ALBUM } from '@/lib/data'

export default function StatsPage() {
  const album = useAlbumStore((s) => s.album)
  const timeline = useAlbumStore((s) => s.timeline)
  const stats = albumStats(album)

  const pct = Math.round((stats.owned / TOTAL_STICKERS) * 100)
  const remaining = TOTAL_STICKERS - stats.owned

  // Group completion breakdown
  const groupStats = ALBUM.map((g) => {
    const gs = album[g.id] ?? {}
    const owned = g.stickers.filter((s) => (gs[s.n]?.owned ?? 0) > 0).length
    return { ...g, owned, total: g.stickers.length, pct: Math.round((owned / g.stickers.length) * 100) }
  }).sort((a, b) => b.pct - a.pct)

  const completed = groupStats.filter((g) => g.pct === 100)
  const inProgress = groupStats.filter((g) => g.pct > 0 && g.pct < 100)
  const untouched = groupStats.filter((g) => g.pct === 0)

  // Simple SVG line chart for timeline
  const chartData = timeline.slice(-30)

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold text-tinta mb-4">Estadísticas</h1>

      {/* Big number */}
      <div className="bg-verde text-white rounded-3xl p-6 mb-4 text-center">
        <div className="text-6xl font-black">{pct}%</div>
        <div className="text-verde-100/80 mt-1">completado</div>
        <div className="flex justify-around mt-4 pt-4 border-t border-white/20">
          <Stat label="Tengo" value={stats.owned} />
          <Stat label="Me falta" value={remaining} />
          <Stat label="Busco" value={stats.needed} />
          <Stat label="Extra" value={stats.extras} />
        </div>
      </div>

      {/* Progress bar full */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-tinta">{stats.owned} / {TOTAL_STICKERS}</span>
          <span className="text-gray-400">{remaining} restantes</span>
        </div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-verde rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Timeline chart */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <div className="text-sm font-medium text-gray-500 mb-3">Progreso últimos 30 días</div>
          <TimelineChart data={chartData} max={TOTAL_STICKERS} />
        </div>
      )}

      {/* Group breakdown */}
      {completed.length > 0 && (
        <Section title={`Completadas (${completed.length})`}>
          {completed.map((g) => <GroupRow key={g.id} g={g} />)}
        </Section>
      )}
      {inProgress.length > 0 && (
        <Section title={`En progreso (${inProgress.length})`}>
          {inProgress.map((g) => <GroupRow key={g.id} g={g} />)}
        </Section>
      )}
      {untouched.length > 0 && (
        <Section title={`Sin empezar (${untouched.length})`}>
          {untouched.slice(0, 5).map((g) => <GroupRow key={g.id} g={g} />)}
          {untouched.length > 5 && <p className="text-xs text-gray-400 mt-1 px-1">y {untouched.length - 5} más...</p>}
        </Section>
      )}

      <div className="h-4" />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-white/70 mt-0.5">{label}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">{title}</div>
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">{children}</div>
    </div>
  )
}

function GroupRow({ g }: { g: { emoji: string; name: string; owned: number; total: number; pct: number } }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="text-xl">{g.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-tinta truncate">{g.name}</div>
        <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
          <div className="h-full bg-verde rounded-full" style={{ width: `${g.pct}%` }} />
        </div>
      </div>
      <span className="text-xs font-bold text-gray-500 shrink-0">{g.owned}/{g.total}</span>
    </div>
  )
}

function TimelineChart({ data, max }: { data: { date: string; owned: number }[]; max: number }) {
  const W = 300, H = 80, PAD = 4
  const minV = 0
  const maxV = Math.max(max, ...data.map((d) => d.owned))
  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((d.owned - minV) / (maxV - minV)) * (H - PAD * 2)
    return `${x},${y}`
  })

  const first = data[0]
  const last = data[data.length - 1]

  return (
    <div className="overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        <polyline points={pts.join(' ')} fill="none" stroke="#006341" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{first?.date?.slice(5)}</span>
        <span>{last?.owned} estampas</span>
        <span>{last?.date?.slice(5)}</span>
      </div>
    </div>
  )
}
