'use client'
/**
 * /admin/print-queue — Mi Panini fulfillment dashboard.
 *
 * Pablo's daily flow:
 *   1. Open this page
 *   2. Filter = PENDING (default)
 *   3. For each row: download photo → print on sticker stock → mark PRINTED
 *   4. When packs shipped/picked up, mark SHIPPED
 *
 * AI-processed photo preferred when present (cleaner cut for print).
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type MiPaniniDraft } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { format } from 'date-fns'
import { Download, ExternalLink } from 'lucide-react'

const STATUSES = ['PENDING', 'PROCESSING', 'PRINTED', 'SHIPPED', 'CANCELLED'] as const
type Status = (typeof STATUSES)[number]

const STATUS_COLOR: Record<Status, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  PENDING:    'info',
  PROCESSING: 'warning',
  PRINTED:    'success',
  SHIPPED:    'success',
  CANCELLED:  'danger',
}

export default function PrintQueuePage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Status[]>(['PENDING', 'PROCESSING'])

  const { data, isLoading } = useQuery({
    queryKey: ['mi-panini-queue', filter.join(',')],
    queryFn: () => api.miPanini.queue(filter.join(',')),
    refetchInterval: 10_000,
  })

  const setStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Status }) => api.miPanini.setStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mi-panini-queue'] }),
  })

  const drafts = data?.items ?? []

  return (
    <div className="p-6 space-y-6">
      <div className="border-b border-white/8 pb-5">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.28em] text-[oklch(0.77_0.163_70)]">
          · Mi Panini · Fulfillment
        </p>
        <h1 className="text-[clamp(1.6rem,3vw,2.5rem)] font-black leading-[0.95] tracking-tight text-white">
          Print queue · <em className="italic text-[oklch(0.84_0.150_80)]">{drafts.length} pendientes</em>
        </h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((status) => {
          const active = filter.includes(status)
          return (
            <button
              key={status}
              onClick={() => {
                setFilter(active ? filter.filter((s) => s !== status) : [...filter, status])
              }}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                active
                  ? 'bg-[oklch(0.77_0.163_70)] text-[#0B1F15]'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {status}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="text-white/40 text-sm">Loading…</div>
      ) : drafts.length === 0 ? (
        <div className="text-white/40 text-sm">No drafts in selected statuses.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drafts.map((d) => (
            <DraftCard
              key={d.id}
              draft={d}
              onSetStatus={(status) => setStatusMut.mutate({ id: d.id, status })}
              saving={setStatusMut.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DraftCard({
  draft, onSetStatus, saving,
}: {
  draft: MiPaniniDraft
  onSetStatus: (status: Status) => void
  saving: boolean
}) {
  const photo = draft.ai_processed_url ?? draft.photo_public_url
  const usingAi = !!draft.ai_processed_url

  return (
    <div className="rounded-2xl bg-[oklch(0.245_0.010_260)] border border-white/8 overflow-hidden">
      {/* Photo */}
      <a href={photo ?? '#'} target="_blank" rel="noreferrer" className="block aspect-square bg-black/40">
        {photo ? (
          <img src={photo} alt={draft.player_name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-white/30 text-xs">no photo</div>
        )}
      </a>

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-black text-white truncate flex-1">{draft.player_name}</h3>
          <span className={`rounded px-1.5 py-0.5 text-[9px] font-black ${
            draft.card_type === 'ORO' ? 'bg-[oklch(0.84_0.150_80)] text-[#0B1F15]'
            : draft.card_type === 'PLATA' ? 'bg-white/80 text-[#0B1F15]'
            : draft.card_type === 'BRONCE' ? 'bg-[oklch(0.55_0.10_50)] text-white'
            : 'bg-white/10 text-white/70'
          }`}>{draft.card_type}</span>
        </div>

        <div className="text-white/50 text-xs">
          {draft.country} · <span className="font-mono">{draft.id}</span> · <span>{format(new Date(draft.created_at), 'MMM d HH:mm')}</span>
        </div>

        {/* Stats line */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {([
            ['PAC', draft.stat_pace],
            ['TIR', draft.stat_shooting],
            ['PAS', draft.stat_passing],
            ['DEF', draft.stat_defending],
          ] as const).map(([k, v]) => (
            <div key={k} className="bg-white/5 rounded p-1">
              <div className="text-white font-black text-sm tabular-nums">{v}</div>
              <div className="text-white/40 text-[9px] font-bold">{k}</div>
            </div>
          ))}
        </div>

        {/* Order link */}
        <div className="text-[11px] text-white/40">
          Order <span className="font-mono text-white/60">{draft.order_number}</span>
        </div>

        {/* AI indicator */}
        <div className="text-[10px] flex items-center gap-1.5">
          {usingAi ? (
            <span className="text-emerald-400 font-bold">✓ AI processed</span>
          ) : (
            <span className="text-amber-400 font-bold">⏳ AI pending — using raw</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {photo && (
            <a
              href={photo}
              download={`mi-panini-${draft.id}.png`}
              className="inline-flex items-center justify-center gap-1.5 rounded bg-white/10 text-white text-xs font-bold py-2 hover:bg-white/15"
            >
              <Download className="w-3 h-3" /> Download photo
            </a>
          )}
          <div className="flex items-center gap-2">
            <Select
              value={draft.status}
              onChange={(e) => onSetStatus(e.target.value as Status)}
              disabled={saving}
              className="flex-1"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Badge variant={STATUS_COLOR[draft.status]}>{draft.status}</Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
