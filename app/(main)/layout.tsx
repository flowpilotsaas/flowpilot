import { Bricolage_Grotesque } from 'next/font/google'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import './marketing.css'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`marketing-site min-h-screen flex flex-col overflow-x-hidden bg-background text-foreground ${bricolage.variable}`}>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
