'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList, FileCheck, MapPin, CalendarClock, AlertTriangle, Plus } from 'lucide-react'

const statCards = [
  { label: 'Agreements',       value: '0',   icon: ClipboardList,  color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { label: 'Pending Approvals',value: '0',   icon: FileCheck,      color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  { label: 'Sites / Assets',   value: '0/0', icon: MapPin,         color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { label: 'Active PM Plans',  value: '0',   icon: CalendarClock,  color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-900/20' },
  { label: 'PM Due / Overdue', value: '0',   icon: AlertTriangle,  color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-900/20' },
]

export default function AgreementsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Agreements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage maintenance contracts and service agreements</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Agreement
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main card */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">Agreements</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Manage maintenance contracts and service agreements</p>
            </div>
            <Button variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              New Agreement
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center">
              <ClipboardList className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">No agreements yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create one to link customers and equipment.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 mt-1">
              <Plus className="w-3.5 h-3.5" />
              New Agreement
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
