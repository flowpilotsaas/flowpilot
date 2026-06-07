'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, PhoneCall } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'calls' | 'phone-numbers' | 'texting'

export default function CommunicationsPage() {
  const [tab, setTab] = React.useState<Tab>('calls')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'calls',         label: 'Calls' },
    { id: 'phone-numbers', label: 'Phone Numbers' },
    { id: 'texting',       label: 'Texting' },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Communications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Messaging and calling for your team</p>
        </div>
        <Button className="gap-2">
          <PhoneCall className="w-4 h-4" />
          Quick Call
        </Button>
      </div>

      {/* Info card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Messaging &amp; calling</p>
              <p className="text-sm text-muted-foreground">Make calls, send texts, and manage your phone numbers all in one place.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs card */}
      <Card className="overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Calls tab */}
        {tab === 'calls' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Status', 'From', 'To', 'Time', 'Line', 'Answered By', 'Customer', 'Revenue', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-6 py-3 font-medium text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Phone className="w-10 h-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">No calls yet.</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Phone Numbers tab */}
        {tab === 'phone-numbers' && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Phone className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No phone numbers configured.</p>
            <Button variant="outline" size="sm">Add Phone Number</Button>
          </div>
        )}

        {/* Texting tab */}
        {tab === 'texting' && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Phone className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No text messages yet.</p>
            <Button variant="outline" size="sm">Send a Text</Button>
          </div>
        )}
      </Card>
    </div>
  )
}
