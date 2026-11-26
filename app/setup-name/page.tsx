'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'

export default function SetupNamePage() {
  const router = useRouter()
  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName]   = React.useState('')
  const [saving, setSaving]       = React.useState(false)
  const [error, setError]         = React.useState('')
  const [loading, setLoading]     = React.useState(true)

  // Redirect if already has a name
  React.useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const { data } = await supabase
        .from('organization_members')
        .select('display_name')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()
      if (data?.display_name) {
        router.replace('/dashboard')
        return
      }
      setLoading(false)
    })
  }, [router])

  const handleContinue = async () => {
    const first = firstName.trim()
    const last  = lastName.trim()
    if (!first) { setError('First name is required.'); return }
    if (!last)  { setError('Last name is required.'); return }

    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); setError('Please sign in and try again.'); return }

    const displayName = `${first} ${last}`
    const { error: err } = await supabase
      .from('organization_members')
      .update({ display_name: displayName })
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (err) { setError(err.message); setSaving(false); return }

    router.replace('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <span className="text-2xl">👋</span>
          </div>
          <h1 className="text-[1.35rem] font-bold text-foreground leading-tight">
            Welcome! What should we call you?
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            This is how your team will see you.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              First name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Jane"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Last name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Smith"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={handleContinue}
            disabled={saving}
            className="w-full rounded-full h-11"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
