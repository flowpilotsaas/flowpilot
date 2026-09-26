'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Lock } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
}

export function TrialExpiredModal({ open, onClose }: Props) {
  const router = useRouter()

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background shadow-xl p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <h2 id="trial-modal-title" className="text-base font-semibold text-foreground">
              Your free trial has ended
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Subscribe to a plan to continue creating and editing records in Jobigram.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            className="flex-1"
            onClick={() => { onClose(); router.push('/dashboard/billing') }}
          >
            Subscribe →
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
