import type { ReactNode } from 'react'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30 flex">
      <DashboardSidebar />
      {/* ml-60 offsets the fixed 240px sidebar */}
      <main className="flex-1 ml-60 overflow-auto">
        {children}
      </main>
    </div>
  )
}
