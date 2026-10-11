'use client'

import { ThemeProvider } from '@/components/ThemeProvider'
import { Toaster } from 'sonner'
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster
        position="top-right"
        visibleToasts={1}
        closeButton
        duration={4000}
        toastOptions={{
          classNames: {
            toast:       'toast-card',
            title:       'toast-title',
            description: 'toast-description',
          },
        }}
        icons={{
          success: <CheckCircle2 className="w-4 h-4 text-success" />,
          error:   <XCircle     className="w-4 h-4 text-destructive" />,
          warning: <AlertTriangle className="w-4 h-4 text-warning" />,
          info:    <Info        className="w-4 h-4 text-primary" />,
        }}
      />
    </ThemeProvider>
  )
}
