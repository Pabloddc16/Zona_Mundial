'use client'
import { useEffect } from 'react'
import { X } from 'lucide-react'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  width?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Sheet({ open, onClose, title, description, children, width = 'md', className }: SheetProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 'w-80', md: 'w-[440px]', lg: 'w-[560px]', xl: 'w-[680px]' }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`${widths[width]} flex flex-col h-full shadow-2xl${className ? ` ${className}` : ''}`}
        style={{
          background: 'var(--surface-elevated)',
          borderLeft: '1px solid oklch(1 0 0 / 0.08)',
          animation: 'sheet-in 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          className="flex items-start justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid oklch(1 0 0 / 0.08)' }}
        >
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
            {description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 ml-4 transition-colors hover:bg-white/8"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          {children}
        </div>
      </div>
    </div>
  )
}
