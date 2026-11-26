'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { label: 'Customer',   optional: false },
  { label: 'Estimate',   optional: true  },
  { label: 'Job',        optional: false },
  { label: 'Technician', optional: false },
]

export function StepBar({ step, done = false }: { step: number; done?: boolean }) {
  const isCompleted = (i: number) => i < step || (i === step && done)
  const isActive    = (i: number) => i === step && !done

  return (
    <div className="flex items-start justify-between w-full">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && (
            <div className={cn('flex-1 h-px mt-3.5 mx-1', isCompleted(i - 1) ? 'bg-primary' : 'bg-border')} />
          )}
          <div className="flex flex-col items-center gap-0.5 w-14 shrink-0">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
              isCompleted(i) ? 'bg-primary text-primary-foreground' :
              isActive(i)    ? 'bg-primary text-primary-foreground ring-2 ring-primary/20 ring-offset-1 ring-offset-background' :
                               'bg-muted text-muted-foreground',
            )}>
              {isCompleted(i) ? <Check className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
            </div>
            <span className={cn(
              'text-[11px] font-medium text-center leading-tight',
              isActive(i) || isCompleted(i) ? 'text-foreground' : 'text-muted-foreground',
            )}>
              {s.label}
            </span>
            {s.optional && (
              <span className="text-[10px] text-muted-foreground/60 leading-none">optional</span>
            )}
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}
