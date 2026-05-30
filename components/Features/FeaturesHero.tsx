'use client';
import { FloatingIconsHero } from '@/components/ui/floating-icons-hero-section'
import {
  Wrench,
  Calendar,
  Truck,
  MapPin,
  ClipboardList,
  HardHat,
  Receipt,
  CreditCard,
  Users,
  Smartphone,
  Route,
  Hammer,
  FileText,
  Bell,
  BarChart3,
  CheckCircle2,
} from 'lucide-react'

const icons = [
  { id: 1,  icon: Wrench,        className: 'top-[18%] left-[10%]' },
  { id: 2,  icon: Calendar,      className: 'top-[22%] right-[8%]' },
  { id: 3,  icon: Truck,         className: 'top-[80%] left-[10%]' },
  { id: 4,  icon: MapPin,        className: 'bottom-[10%] right-[10%]' },
  { id: 5,  icon: ClipboardList, className: 'top-[15%] left-[30%]' },
  { id: 6,  icon: HardHat,       className: 'top-[15%] right-[30%]' },
  { id: 7,  icon: Receipt,       className: 'bottom-[8%] left-[25%]' },
  { id: 8,  icon: CreditCard,    className: 'top-[40%] left-[15%]' },
  { id: 9,  icon: Users,         className: 'top-[75%] right-[25%]' },
  { id: 10, icon: Smartphone,    className: 'top-[90%] left-[70%]' },
  { id: 11, icon: Route,         className: 'top-[50%] right-[5%]' },
  { id: 12, icon: Hammer,        className: 'top-[55%] left-[5%]' },
  { id: 13, icon: FileText,      className: 'top-[15%] left-[55%]' },
  { id: 14, icon: Bell,          className: 'bottom-[5%] right-[45%]' },
  { id: 15, icon: BarChart3,     className: 'top-[25%] right-[20%]' },
  { id: 16, icon: CheckCircle2,  className: 'top-[60%] left-[30%]' },
]

export default function FeaturesHero() {
  return (
    <FloatingIconsHero
      title="Everything you need to run the job"
      subtitle="From the first phone call to final payment, Flow Pilot covers every step of your field service business."
      ctaText="Book a demo"
      ctaHref="/contact"
      icons={icons}
    />
  )
}
