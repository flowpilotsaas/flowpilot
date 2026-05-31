'use client'

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, MoveRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Hero() {
  const [titleNumber, setTitleNumber] = useState(0)
  const titles = useMemo(
    () => ["smarter", "faster", "simpler", "modern", "effortless"],
    []
  )

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setTitleNumber((prev) => (prev === titles.length - 1 ? 0 : prev + 1))
    }, 2000)
    return () => clearTimeout(timeoutId)
  }, [titleNumber, titles])

  return (
    <div className="w-full">
      <div className="container mx-auto">
        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">

          {/* Badge */}
          <div>
            <Button variant="secondary" size="sm" className="gap-4 rounded-full">
              Built for modern field service teams <MoveRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Headline */}
          <div className="flex gap-4 flex-col">
            <h1 className="text-5xl md:text-7xl max-w-2xl tracking-tighter text-center font-regular">
              <span>Field service made</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-semibold"
                    initial={{ opacity: 0, y: -100 }}
                    transition={{ type: "spring", stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? { y: 0, opacity: 1 }
                        : {
                            y: titleNumber > index ? -150 : 150,
                            opacity: 0,
                          }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl text-center">
              Flow Pilot brings scheduling, dispatching, and invoicing together
              in one intelligent platform — so your team spends less time on
              admin and more time in the field.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-row gap-3">
            <Button variant="cta-outline" size="cta" className="gap-2" asChild>
              <Link href="/demo">
                Book a demo <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button variant="cta" size="cta" className="gap-2" asChild>
              <Link href="/signup">
                Start free trial <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

        </div>
      </div>
    </div>
  )
}
