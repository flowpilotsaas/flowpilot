'use client'

import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DeleteConfirmModalProps {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  onCancel: () => void
  onConfirm: () => void
  loading?: boolean
}

export function DeleteConfirmModal({
  open,
  title,
  message = "This can't be undone.",
  confirmLabel = 'Delete',
  onCancel,
  onConfirm,
  loading,
}: DeleteConfirmModalProps) {
  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-popover rounded-xl border border-border shadow-xl w-full max-w-sm mx-4">
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {message && (
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
            )}
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
