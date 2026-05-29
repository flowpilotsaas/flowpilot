'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Truck, FileText, Users } from 'lucide-react'

const features = [
  {
    id: 1,
    icon: Calendar,
    title: 'Smart Scheduling',
    description:
      'Drag jobs onto a live calendar and see technician availability at a glance. Conflicts are flagged instantly — so you book with confidence and never double-up.',
    image: 'https://placehold.co/600x400/e0f2fe/0284c7?text=Scheduling+View',
  },
  {
    id: 2,
    icon: Truck,
    title: 'Real-Time Dispatch',
    description:
      'Push jobs to any technician in the field with a single click. Track live location and job status as your team works through the day — no phone tag needed.',
    image: 'https://placehold.co/600x400/f0fdf4/16a34a?text=Dispatch+Map',
  },
  {
    id: 3,
    icon: FileText,
    title: 'Automated Invoicing',
    description:
      'The moment a job is marked complete, Flow Pilot generates an accurate invoice. Send it by email or SMS in seconds and collect payment online — from anywhere.',
    image: 'https://placehold.co/600x400/fdf4ff/9333ea?text=Invoice+View',
  },
  {
    id: 4,
    icon: Users,
    title: 'Customer Portal',
    description:
      'Give customers a self-service hub to track job status, approve quotes, and pay invoices online. Fewer calls to your office, happier customers.',
    image: 'https://placehold.co/600x400/fff7ed/ea580c?text=Customer+Portal',
  },
]

export default function Features() {
  const [currentFeature, setCurrentFeature] = useState(0)
  const [progress, setProgress] = useState(0)
  const featureRefs = useRef<(HTMLDivElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 100 : prev + 1))
    }, 100)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (progress >= 100) {
      const t = setTimeout(() => {
        setCurrentFeature((prev) => (prev + 1) % features.length)
        setProgress(0)
      }, 200)
      return () => clearTimeout(t)
    }
  }, [progress])

  useEffect(() => {
    const el = featureRefs.current[currentFeature]
    const container = containerRef.current
    if (el && container) {
      const cRect = container.getBoundingClientRect()
      const eRect = el.getBoundingClientRect()
      container.scrollTo({
        left: el.offsetLeft - (cRect.width - eRect.width) / 2,
        behavior: 'smooth',
      })
    }
  }, [currentFeature])

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Everything your crew needs
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-4">
            Built for the way field work actually happens
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From the first call to the final invoice, Flow Pilot handles every step so your
            team can focus on the work — not the admin.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 lg:gap-16 gap-8 items-center">
          {/* Left: feature list */}
          <div
            ref={containerRef}
            className="lg:space-y-8 md:space-x-6 lg:space-x-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] lg:overflow-visible flex lg:flex-col flex-row order-2 lg:order-1 pb-4 scroll-smooth"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon
              const isActive = currentFeature === index
              return (
                <div
                  key={feature.id}
                  ref={(el) => { featureRefs.current[index] = el }}
                  className="relative cursor-pointer flex-shrink-0"
                  onClick={() => { setCurrentFeature(index); setProgress(0) }}
                >
                  <div
                    className={`flex lg:flex-row flex-col items-start space-x-4 p-3 max-w-sm md:max-w-sm lg:max-w-2xl transition-all duration-300 ${
                      isActive
                        ? 'bg-white dark:bg-black/80 md:shadow-xl dark:drop-shadow-lg rounded-xl md:border dark:border-none border-gray-200'
                        : ''
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`p-3 hidden md:block rounded-full flex-shrink-0 transition-all duration-300 ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      <Icon size={24} />
                    </div>

                    {/* Text */}
                    <div className="flex-1">
                      <h3
                        className={`text-lg md:mt-4 lg:mt-0 font-semibold mb-2 transition-colors duration-300 ${
                          isActive
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-700 dark:text-white/80'
                        }`}
                      >
                        {feature.title}
                      </h3>
                      <p
                        className={`text-sm transition-colors duration-300 ${
                          isActive
                            ? 'text-gray-600 dark:text-white/60'
                            : 'text-gray-500 dark:text-white/40'
                        }`}
                      >
                        {feature.description}
                      </p>

                      {/* Progress bar */}
                      <div className="mt-4 bg-gray-100 dark:bg-white/10 rounded-sm h-1 overflow-hidden">
                        {isActive && (
                          <motion.div
                            className="h-full bg-gradient-to-r from-primary/70 to-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.1, ease: 'linear' }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right: image */}
          <div className="relative order-1 lg:order-2 max-w-lg mx-auto w-full">
            <motion.div
              key={currentFeature}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="rounded-2xl border border-gray-100 dark:border-none shadow-lg w-full"
                src={features[currentFeature].image}
                alt={features[currentFeature].title}
                width={600}
                height={400}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
