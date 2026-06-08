'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe, RefreshCw, Star, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'reviews' | 'posts'

export default function GooglePage() {
  const [tab, setTab] = React.useState<Tab>('reviews')

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Google Business Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your reviews and posts from Google</p>
        </div>
        <Button className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Sync Reviews
        </Button>
      </div>

      {/* Tabs card */}
      <Card className="overflow-hidden">
        <div className="flex border-b border-border">
          {([
            { id: 'reviews' as Tab, label: 'Reviews',  icon: Star },
            { id: 'posts'   as Tab, label: 'Posts',    icon: FileText },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                tab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <CardContent className="p-0">
          {tab === 'reviews' && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-14 h-14 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center">
                <Star className="w-7 h-7 text-yellow-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">No reviews synced yet</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Connect your Google Business Profile and sync reviews to see them here.
                </p>
              </div>
              <Button variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Sync Now
              </Button>
            </div>
          )}

          {tab === 'posts' && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <FileText className="w-7 h-7 text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">No posts synced yet</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Connect your Google Business Profile to create and manage posts here.
                </p>
              </div>
              <Button variant="outline" className="gap-2">
                <Globe className="w-4 h-4" />
                Connect Profile
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
