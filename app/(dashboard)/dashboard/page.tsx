'use client'

import * as React from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, ArrowRight, Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const [email, setEmail] = React.useState<string | null>(null)
  const [customerCount, setCustomerCount] = React.useState<number | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setEmail(user?.email ?? null)

      if (user) {
        const { count } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
        setCustomerCount(count ?? 0)
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh] text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading…
      </div>
    )
  }

  return (
    <div className="px-8 pt-12 pb-8 max-w-4xl mx-auto">
      {/* Greeting */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
        {email && (
          <p className="text-sm text-muted-foreground mt-1">{email}</p>
        )}
        <p className="text-sm text-muted-foreground mt-3">
          Here&rsquo;s what&rsquo;s happening with your customers.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <Card className="sm:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground tracking-tight">
              {customerCount ?? '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">stored in your database</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/customers">
              <Users className="w-4 h-4" />
              View all customers
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
