'use client'
import { useState, useCallback } from 'react'
import { useAlbumStore, albumStats } from '@/lib/album-store'
import { ALBUM, fmt } from '@/lib/data'
import { cn } from '@/lib/cn'

type Mode = 'offer' | 'scan'

export default function SwapPage() {
  const [mode, setMode] = useState<Mode>('offer')
  const [qrData, setQrData] = useState<string | null>(null)
  const [scanInput, setScanInput] = useState('')
  const [parsed, setParsed] = useState<SwapPayload | null>(null)
  const [parseError, setParseError] = useState('')

  const album = useAlbumStore((s) => s.album)
  const stats = albumStats(album)

  // Collect extras (owned > 1) and needed (needed > 0)
  const extras: Array<{ code: string; label: string; price: number }> = []
  const needed: Array<{ code: string; label: string; price: number }> = []

  for (const g of ALBUM) {
    const gs = album[g.id] ?? {}
    for (const s of g.stickers) {
      const st = gs[s.n]
      if ((st?.owned ?? 0) > 1) extras.push({ code: s.code, label: s.label, price: s.price })
      if ((st?.needed ?? 0) > 0) needed.push({ code: s.code, label: s.label, price: s.price })
    }
  }

  const payload: SwapPayload = { extras: extras.map((e) => e.code), needed: needed.map((n) => n.code), v: 1 }
  const encoded = btoa(JSON.stringify(payload))

  function generateQr() {
    setQrData(encoded)
  }

  function copyCode() {
    navigator.clipboard.writeText(encoded).catch(() => {})
  }

  function parseScan() {
    setParseError('')
    try {
      const decoded = JSON.parse(atob(scanInput.trim())) as SwapPayload
      if (!decoded.extras || !decoded.needed) throw new Error('invalid')
      setParsed(decoded)
    } catch {
      setParseError('Código inválido. Pide al otro usuario que genere su código de swap.')
    }
  }

  // Find matches: their extras that I need, my extras that they need
  const theyHaveINeed = parsed ? parsed.extras.filter((c) => needed.find((n) => n.code === c)) : []
  const iHaveTheyNeed = parsed ? extras.filter((e) => parsed.needed.includes(e.code)) : []

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold text-tinta mb-1">Swap de estampas</h1>
      <p className="text-sm text-gray-400 mb-4">Intercambia tus extras con otros coleccionistas</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
        <button onClick={() => setMode('offer')} className={cn('flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors', mode === 'offer' ? 'bg-white shadow text-tinta' : 'text-gray-500')}>
          Mi oferta
        </button>
        <button onClick={() => setMode('scan')} className={cn('flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors', mode === 'scan' ? 'bg-white shadow text-tinta' : 'text-gray-500')}>
          Escanear
        </button>
      </div>

      {mode === 'offer' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Tengo extra" value={extras.length} color="verde" />
            <StatCard label="Busco" value={needed.length} color="rojo" />
          </div>

          {extras.length === 0 && needed.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <div className="text-4xl mb-3">📚</div>
              Marca tus estampas en el álbum para generar tu código de swap
            </div>
          ) : (
            <>
              {extras.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Mis extras ({extras.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {extras.map((e) => <Chip key={e.code} code={e.code} color="verde" />)}
                  </div>
                </div>
              )}
              {needed.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Busco ({needed.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {needed.map((n) => <Chip key={n.code} code={n.code} color="rojo" />)}
                  </div>
                </div>
              )}

              {/* Generate code */}
              <button onClick={generateQr} className="w-full py-3 bg-verde text-white rounded-2xl font-bold">
                Generar código de swap
              </button>

              {qrData && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs text-gray-500 mb-2">Comparte este código con otro coleccionista:</p>
                  <div className="bg-white rounded-xl p-3 font-mono text-xs break-all text-gray-600 border border-gray-200">{qrData}</div>
                  <button onClick={copyCode} className="mt-2 text-sm text-verde font-medium">Copiar código</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {mode === 'scan' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Código del otro usuario</label>
            <textarea
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Pega aquí el código de swap..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-verde/30 focus:border-verde text-sm bg-white font-mono resize-none"
            />
          </div>
          {parseError && <p className="text-rojo text-sm">{parseError}</p>}
          <button onClick={parseScan} className="w-full py-3 bg-tinta text-white rounded-2xl font-bold">
            Ver coincidencias
          </button>

          {parsed && (
            <div className="space-y-3">
              {theyHaveINeed.length > 0 ? (
                <div className="bg-verde/5 border border-verde/20 rounded-2xl p-4">
                  <div className="text-sm font-bold text-verde mb-2">Ellos tienen lo que buscas ({theyHaveINeed.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {theyHaveINeed.map((c) => <Chip key={c} code={c} color="verde" />)}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">No tienen estampas que busques</p>
              )}

              {iHaveTheyNeed.length > 0 ? (
                <div className="bg-dorado/10 border border-dorado/30 rounded-2xl p-4">
                  <div className="text-sm font-bold text-tinta mb-2">Tú tienes lo que buscan ({iHaveTheyNeed.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {iHaveTheyNeed.map((e) => <Chip key={e.code} code={e.code} color="dorado" />)}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-2">No tienes extras que ellos busquen</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface SwapPayload { extras: string[]; needed: string[]; v: number }

function StatCard({ label, value, color }: { label: string; value: number; color: 'verde' | 'rojo' }) {
  const colors = { verde: 'bg-verde/10 text-verde', rojo: 'bg-rojo/10 text-rojo' }
  return (
    <div className={`rounded-2xl p-4 text-center ${colors[color]}`}>
      <div className="text-3xl font-black">{value}</div>
      <div className="text-sm font-medium mt-0.5">{label}</div>
    </div>
  )
}

function Chip({ code, color }: { code: string; color: 'verde' | 'rojo' | 'dorado' }) {
  const colors = { verde: 'bg-verde/10 text-verde border-verde/20', rojo: 'bg-rojo/10 text-rojo border-rojo/20', dorado: 'bg-dorado/10 text-tinta border-dorado/30' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold border ${colors[color]}`}>{code}</span>
  )
}
