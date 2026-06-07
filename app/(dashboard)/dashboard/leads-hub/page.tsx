'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw, Zap, DollarSign, MapPin, Bell } from 'lucide-react'

const QUICK_AMOUNTS = [50, 100, 200, 500]

export default function LeadsHubPage() {
  const [customAmount, setCustomAmount] = React.useState('')
  const [selectedAmount, setSelectedAmount] = React.useState<number | null>(null)
  const [zipCodes, setZipCodes]         = React.useState('')
  const [state, setState]               = React.useState('')
  const [region, setRegion]             = React.useState('')
  const [smsAlert, setSmsAlert]         = React.useState('')
  const [emailAlert, setEmailAlert]     = React.useState('')

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Leads Hub</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your lead balance, service area, and assignment alerts</p>
      </div>

      {/* Balance card */}
      <Card className="bg-gray-900 dark:bg-gray-950 border-gray-800">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-400 font-medium">Current Prepaid Balance</p>
              <p className="text-4xl font-bold text-white mt-2">$0.00</p>
              <p className="text-sm text-gray-400 mt-3 max-w-sm leading-relaxed">
                Maintain a minimum balance to receive lead assignments. Funds are deducted per assigned lead based on your service area.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white gap-2 shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh balance
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add funds */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            Add Funds
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => { setSelectedAmount(amt); setCustomAmount('') }}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  selectedAmount === amt
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <Input
              type="number"
              min="1"
              placeholder="Custom amount ($)"
              value={customAmount}
              onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null) }}
              className="flex-1"
            />
            <Button className="gap-2">
              <Zap className="w-4 h-4" />
              Checkout
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Service area */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            Service Area
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <Field label="ZIP Codes (comma-separated)">
            <Input placeholder="e.g. 90210, 90211, 90212" value={zipCodes} onChange={(e) => setZipCodes(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="State">
              <Input placeholder="e.g. CA" value={state} onChange={(e) => setState(e.target.value)} />
            </Field>
            <Field label="Region">
              <Input placeholder="e.g. Los Angeles" value={region} onChange={(e) => setRegion(e.target.value)} />
            </Field>
          </div>
          <Button variant="outline" className="w-full">Save Service Area</Button>
        </CardContent>
      </Card>

      {/* Assignment alerts */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-500" />
            Assignment Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <Field label="SMS Number">
            <Input type="tel" placeholder="+1 (555) 000-0000" value={smsAlert} onChange={(e) => setSmsAlert(e.target.value)} />
          </Field>
          <Field label="Email Address">
            <Input type="email" placeholder="alerts@yourcompany.com" value={emailAlert} onChange={(e) => setEmailAlert(e.target.value)} />
          </Field>
          <Button variant="outline" className="w-full">Save Alert Settings</Button>
        </CardContent>
      </Card>

      {/* Assigned leads */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base font-semibold text-foreground">Your Assigned Leads</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Zap className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No leads assigned yet.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  )
}
