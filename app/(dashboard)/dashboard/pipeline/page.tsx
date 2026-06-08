'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, GitBranch, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

type Column = {
  id: string
  label: string
  color: string
  dotColor: string
}

const COLUMNS: Column[] = [
  { id: 'new',        label: 'New',        color: 'bg-gray-50 dark:bg-gray-900/30',   dotColor: 'bg-gray-400' },
  { id: 'contacted',  label: 'Contacted',  color: 'bg-blue-50 dark:bg-blue-900/20',   dotColor: 'bg-blue-400' },
  { id: 'quote-sent', label: 'Quote Sent', color: 'bg-yellow-50 dark:bg-yellow-900/20', dotColor: 'bg-yellow-400' },
  { id: 'won',        label: 'Won',        color: 'bg-green-50 dark:bg-green-900/20', dotColor: 'bg-green-500' },
  { id: 'lost',       label: 'Lost',       color: 'bg-red-50 dark:bg-red-900/20',     dotColor: 'bg-red-400' },
]

export default function PipelinePage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Leads &amp; Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your leads through the sales process</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Send className="w-4 h-4" />
            Send portal link
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Lead
          </Button>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh]">
        {COLUMNS.map((col) => (
          <div key={col.id} className="flex-shrink-0 w-64 flex flex-col gap-3">
            {/* Column header */}
            <div className="flex items-center gap-2 px-1">
              <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', col.dotColor)} />
              <span className="text-sm font-semibold text-foreground">{col.label}</span>
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">0</span>
            </div>

            {/* Drop zone */}
            <div className={cn('flex-1 rounded-xl border-2 border-dashed border-border/60 p-3 flex flex-col gap-2 min-h-[400px]', col.color)}>
              <div className="flex flex-col items-center justify-center h-32 gap-2 mt-8">
                <GitBranch className="w-7 h-7 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground text-center">No leads here yet.</p>
              </div>
            </div>

            {/* Add button */}
            <button
              type="button"
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add lead
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
