'use client'

import * as React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Route,
  Smartphone,
  Users,
  FileText,
  CreditCard,
  Plug,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type Feature = {
  id: string | number
  title: string
  category: string
  description: string
  icon: React.ElementType
  color: string
}

const FEATURES: Feature[] = [
  {
    id: 1,
    category: "Scheduling",
    title: "Job scheduling & calendar",
    description:
      "Drag-and-drop scheduling with calendar views by day, week, or month. Set up recurring jobs and let Flow Pilot handle the repeats.",
    icon: Calendar,
    color: "bg-blue-500",
  },
  {
    id: 2,
    category: "Operations",
    title: "Dispatching & route optimization",
    description:
      "Assign jobs to the right tech automatically. AI-powered route planning minimizes drive time and maximizes jobs per day.",
    icon: Route,
    color: "bg-emerald-500",
  },
  {
    id: 3,
    category: "On the job",
    title: "Mobile app for technicians",
    description:
      "Your techs see their day, capture photos, collect signatures, and update job status — all from their phone, even offline.",
    icon: Smartphone,
    color: "bg-violet-500",
  },
  {
    id: 4,
    category: "CRM",
    title: "Customer database",
    description:
      "Every customer, every job, every note in one place. Full service history at your fingertips when the phone rings.",
    icon: Users,
    color: "bg-amber-500",
  },
  {
    id: 5,
    category: "Sales",
    title: "Quotes & estimates",
    description:
      "Send professional quotes in minutes. Customers approve online and they convert straight into scheduled jobs.",
    icon: FileText,
    color: "bg-rose-500",
  },
  {
    id: 6,
    category: "Get paid",
    title: "Invoicing & online payments",
    description:
      "Invoice on-site or after the job. Accept credit cards, ACH, and Apple Pay. Money in your account, not in limbo.",
    icon: CreditCard,
    color: "bg-cyan-500",
  },
  {
    id: 7,
    category: "Integrations",
    title: "QuickBooks integration",
    description:
      "Two-way sync with QuickBooks Online. Invoices, payments, and customers stay in lockstep — no more double entry.",
    icon: Plug,
    color: "bg-orange-500",
  },
  {
    id: 8,
    category: "Insights",
    title: "Reporting & analytics",
    description:
      "Know your numbers. Revenue, jobs per tech, customer retention, profitability per service — all in real time.",
    icon: BarChart3,
    color: "bg-fuchsia-500",
  },
]

// Slide the icon block up/down (same axis as the original)
const blockVariants = {
  enter: (direction: "left" | "right") => ({
    y: direction === "right" ? "100%" : "-100%",
    opacity: 0,
  }),
  center: { y: 0, opacity: 1 },
  exit: (direction: "left" | "right") => ({
    y: direction === "right" ? "-100%" : "100%",
    opacity: 0,
  }),
}

// Slide the text left/right (same as the original)
const textVariants = {
  enter: (direction: "left" | "right") => ({
    x: direction === "right" ? 50 : -50,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: "left" | "right") => ({
    x: direction === "right" ? -50 : 50,
    opacity: 0,
  }),
}

export default function FeaturesSlider({ className }: { className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState<"left" | "right">("right")

  const activeFeature = FEATURES[currentIndex]
  const ActiveIcon = activeFeature.icon

  const handleNext = () => {
    setDirection("right")
    setCurrentIndex((prev) => (prev + 1) % FEATURES.length)
  }

  const handlePrev = () => {
    setDirection("left")
    setCurrentIndex((prev) => (prev - 1 + FEATURES.length) % FEATURES.length)
  }

  const handleThumbnailClick = (index: number) => {
    setDirection(index > currentIndex ? "right" : "left")
    setCurrentIndex(index)
  }

  // Show up to 3 features that are not the current one
  const thumbnailFeatures = FEATURES.filter((_, i) => i !== currentIndex).slice(0, 3)

  return (
    <div
      className={cn(
        "relative w-full min-h-[650px] md:min-h-[600px] overflow-hidden bg-background text-foreground p-8 md:p-12",
        className,
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-full">

        {/* === Left Column: pagination + vertical label + thumbnails === */}
        <div className="md:col-span-3 flex flex-col justify-between order-2 md:order-1">
          <div className="flex flex-row md:flex-col justify-between md:justify-start space-x-4 md:space-x-0 md:space-y-4">
            {/* Pagination counter */}
            <span className="text-sm text-muted-foreground font-mono">
              {String(currentIndex + 1).padStart(2, "0")} /{" "}
              {String(FEATURES.length).padStart(2, "0")}
            </span>
            {/* Vertical "Features" label */}
            <h2 className="text-sm font-medium tracking-widest uppercase [writing-mode:vertical-rl] md:rotate-180 hidden md:block">
              Features
            </h2>
          </div>

          {/* Thumbnail navigation — colored icon blocks */}
          <div className="flex space-x-2 mt-8 md:mt-0">
            {thumbnailFeatures.map((feature) => {
              const originalIndex = FEATURES.findIndex((f) => f.id === feature.id)
              const ThumbIcon = feature.icon
              return (
                <button
                  key={feature.id}
                  type="button"
                  onClick={() => handleThumbnailClick(originalIndex)}
                  className="overflow-hidden rounded-md w-16 h-20 md:w-20 md:h-24 opacity-70 hover:opacity-100 transition-opacity duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                  aria-label={`View feature: ${feature.title}`}
                >
                  <div
                    className={cn(
                      "w-full h-full flex items-center justify-center",
                      feature.color,
                    )}
                  >
                    <ThumbIcon size={28} className="text-white" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* === Center Column: animated main icon block === */}
        <div className="md:col-span-4 relative h-80 min-h-[400px] md:min-h-[500px] order-1 md:order-2">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={blockVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              className={cn(
                "absolute inset-0 w-full h-full rounded-lg flex items-center justify-center",
                activeFeature.color,
              )}
            >
              <ActiveIcon size={80} className="text-white" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* === Right Column: animated text + navigation === */}
        <div className="md:col-span-5 flex flex-col justify-between md:pl-8 order-3">
          {/* Animated text content */}
          <div className="relative overflow-hidden pt-4 md:pt-24 min-h-[200px]">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={textVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              >
                <p className="text-sm font-medium text-muted-foreground">
                  {activeFeature.category}
                </p>
                <h3 className="text-xl font-semibold mt-1">
                  {activeFeature.title}
                </h3>
                <p className="mt-6 text-xl md:text-2xl font-medium leading-snug">
                  {activeFeature.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Prev / Next buttons */}
          <div className="flex items-center space-x-2 mt-8 md:mt-0">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full w-12 h-12 border-muted-foreground/50"
              onClick={handlePrev}
              aria-label="Previous feature"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="default"
              size="icon"
              className="rounded-full w-12 h-12"
              onClick={handleNext}
              aria-label="Next feature"
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
