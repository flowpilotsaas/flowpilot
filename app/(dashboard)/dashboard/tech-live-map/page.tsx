'use client'

import * as React from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Loader2 } from 'lucide-react'

type Technician = {
  id: string
  name: string
  status: string
}

export default function TechLiveMapPage() {
  const [techs, setTechs]     = React.useState<Technician[]>([])
  const [loading, setLoading] = React.useState(true)
  const [gpsEnabled, setGpsEnabled] = React.useState(false)

  React.useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('team_members')
        .select('id, name, status')
        .eq('user_id', user.id)
        .eq('role', 'Technician')
        .order('name')
      if (data) setTechs(data)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Technician Live Locations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">See where your team is in real time</p>
      </div>

      {/* GPS toggle card */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Live technician map</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Allow live GPS from technicians
            </p>
          </div>
          {/* Visual-only toggle */}
          <button
            type="button"
            onClick={() => setGpsEnabled((v) => !v)}
            aria-checked={gpsEnabled}
            role="switch"
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              gpsEnabled ? 'bg-primary' : 'bg-input'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                gpsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </CardContent>
      </Card>

      {/* Map placeholder */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">Map</CardTitle>
          <p className="text-sm text-muted-foreground">Positions refresh automatically every 30 seconds</p>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <div className="w-full h-80 rounded-xl bg-muted/50 border border-border flex flex-col items-center justify-center gap-3">
            <MapPin className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Map will display here when technicians enable GPS tracking
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Technician list */}
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-base font-semibold text-foreground">Technicians</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : techs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <MapPin className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No technicians found.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {techs.map((tech) => (
                <div key={tech.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground uppercase">
                      {tech.name.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{tech.name}</p>
                      <p className="text-xs text-muted-foreground">{tech.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Last ping</p>
                    <p className="text-xs font-medium text-foreground">Never</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
