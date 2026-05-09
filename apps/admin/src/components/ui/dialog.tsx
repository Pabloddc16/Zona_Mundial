'use client'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (open) ref.current?.showModal()
    else ref.current?.close()
  }, [open])

  if (!open) return null

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={cn('fixed inset-0 z-50 m-auto max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl p-0 shadow-2xl backdrop:bg-black/60', className)}
      style={{ background: 'oklch(0.215 0.010 260)', border: '1px solid oklch(1 0 0 / 0.10)' }}
    >
      {title && (
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid oklch(1 0 0 / 0.08)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 transition-colors hover:bg-white/10" style={{ color: 'var(--text-secondary)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="p-5">{children}</div>
    </dialog>
  )
}
