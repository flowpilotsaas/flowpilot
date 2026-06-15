'use client'

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const SQRT_5000 = Math.sqrt(5000)

const testimonials = [
  { tempId: 0,  testimonial: "PilotWork cut our dispatch time in half. Our techs spend more time on-site and less time waiting for job details.", by: "Marcus, Operations Manager at ClearWater Plumbing", imgSrc: "https://i.pravatar.cc/150?img=1" },
  { tempId: 1,  testimonial: "Invoicing used to take me half a day every Friday. Now it takes 10 minutes. I genuinely can't believe we waited this long.", by: "Sandra, Owner at Sparks Electrical", imgSrc: "https://i.pravatar.cc/150?img=2" },
  { tempId: 2,  testimonial: "Our customers love the job-tracking link. We've seen a 30% drop in 'where is my tech?' phone calls.", by: "Derek, Service Director at Arctic HVAC", imgSrc: "https://i.pravatar.cc/150?img=3" },
  { tempId: 3,  testimonial: "We grew from 4 techs to 12 without adding any admin staff. PilotWork scaled right with us.", by: "Priya, Founder at ProFix Services", imgSrc: "https://i.pravatar.cc/150?img=4" },
  { tempId: 4,  testimonial: "Scheduling conflicts used to ruin our Mondays. Now the system catches everything automatically and our team is actually happy.", by: "Tom, Owner at QuickFix Appliance Repair", imgSrc: "https://i.pravatar.cc/150?img=5" },
  { tempId: 5,  testimonial: "Getting paid faster was the biggest win. Online invoicing cut our average payment time from 30 days to 6.", by: "Anita, Owner at Comfort Zone HVAC", imgSrc: "https://i.pravatar.cc/150?img=6" },
  { tempId: 6,  testimonial: "The mobile app for our techs is a game-changer. They get their entire day on one screen — address, notes, and all.", by: "Lisa, Office Manager at Summit Roofing", imgSrc: "https://i.pravatar.cc/150?img=7" },
  { tempId: 7,  testimonial: "I used to spend 2 hours every morning building the dispatch board. Now it takes 15 minutes, tops.", by: "Greg, Dispatcher at Precision Pest Control", imgSrc: "https://i.pravatar.cc/150?img=8" },
  { tempId: 8,  testimonial: "The customer portal alone is worth the subscription. Clients approve quotes online instead of playing phone tag.", by: "James, CEO at ProCare Plumbing", imgSrc: "https://i.pravatar.cc/150?img=9" },
  { tempId: 9,  testimonial: "We tried two other platforms before PilotWork. Nothing else comes close for field service.", by: "Kelly, Operations Lead at BrightSpark Electric", imgSrc: "https://i.pravatar.cc/150?img=10" },
  { tempId: 10, testimonial: "Onboarding was shockingly fast. Our whole team was up and running by lunch on day one.", by: "Nathan, Owner at Alpine Landscaping", imgSrc: "https://i.pravatar.cc/150?img=11" },
  { tempId: 11, testimonial: "I can see every tech's location and job status from my phone. It's like having eyes in the field 24/7.", by: "Rosa, Dispatcher at CityWide HVAC", imgSrc: "https://i.pravatar.cc/150?img=12" },
  { tempId: 12, testimonial: "We stopped losing jobs to competitors because our response time is so much faster now.", by: "Mike, Owner at Reliable Garage Doors", imgSrc: "https://i.pravatar.cc/150?img=13" },
  { tempId: 13, testimonial: "PilotWork's reporting showed us which jobs were actually profitable. That insight alone paid for the software.", by: "Helen, CFO at ServiceMax Electric", imgSrc: "https://i.pravatar.cc/150?img=14" },
  { tempId: 14, testimonial: "Our techs actually enjoy using it. That has never happened with any software we've tried before.", by: "Chris, Operations Manager at Coastal Plumbing", imgSrc: "https://i.pravatar.cc/150?img=15" },
  { tempId: 15, testimonial: "Five stars isn't enough. This has genuinely changed how I run my business.", by: "Dave, Owner at TrueNorth HVAC", imgSrc: "https://i.pravatar.cc/150?img=16" },
  { tempId: 16, testimonial: "The automated appointment reminders cut our no-show rate to almost zero.", by: "Mia, Admin at PureAir Services", imgSrc: "https://i.pravatar.cc/150?img=17" },
  { tempId: 17, testimonial: "We handle twice the job volume with the same team. PilotWork is the only reason that's possible.", by: "Ben, Director at GreenMark Landscaping", imgSrc: "https://i.pravatar.cc/150?img=18" },
  { tempId: 18, testimonial: "Billing errors dropped to zero after switching. The automated invoicing is completely accurate.", by: "Carla, Bookkeeper at ProShield Roofing", imgSrc: "https://i.pravatar.cc/150?img=19" },
  { tempId: 19, testimonial: "If you run a field service business and you're not on PilotWork, you are leaving money on the table.", by: "Eric, Owner at Summit Electrical", imgSrc: "https://i.pravatar.cc/150?img=20" },
]

interface TestimonialCardProps {
  position: number
  testimonial: typeof testimonials[0]
  handleMove: (steps: number) => void
  cardSize: number
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({ position, testimonial, handleMove, cardSize }) => {
  const isCenter = position === 0
  return (
    <div
      onClick={() => handleMove(position)}
      className={cn(
        'absolute left-1/2 top-1/2 cursor-pointer border-2 p-8 transition-all duration-500 ease-in-out',
        isCenter
          ? 'z-10 bg-primary text-primary-foreground border-primary'
          : 'z-0 bg-card text-card-foreground border-border hover:border-primary/50'
      )}
      style={{
        width: cardSize,
        height: cardSize,
        clipPath: `polygon(50px 0%, calc(100% - 50px) 0%, 100% 50px, 100% 100%, calc(100% - 50px) 100%, 50px 100%, 0 100%, 0 0)`,
        transform: `
          translate(-50%, -50%)
          translateX(${(cardSize / 1.5) * position}px)
          translateY(${isCenter ? -65 : position % 2 ? 15 : -15}px)
          rotate(${isCenter ? 0 : position % 2 ? 2.5 : -2.5}deg)
        `,
        boxShadow: isCenter ? '0px 8px 0px 4px hsl(var(--border))' : '0px 0px 0px 0px transparent',
      }}
    >
      <span
        className="absolute block origin-top-right rotate-45 bg-border"
        style={{ right: -2, top: 48, width: SQRT_5000, height: 2 }}
      />
      <img
        src={testimonial.imgSrc}
        alt={testimonial.by.split(',')[0]}
        className="mb-4 h-14 w-12 bg-muted object-cover object-top"
        style={{ boxShadow: '3px 3px 0px hsl(var(--background))' }}
      />
      <h3 className={cn('text-base sm:text-xl font-medium', isCenter ? 'text-primary-foreground' : 'text-foreground')}>
        "{testimonial.testimonial}"
      </h3>
      <p className={cn('absolute bottom-8 left-8 right-8 mt-2 text-sm italic', isCenter ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
        — {testimonial.by}
      </p>
    </div>
  )
}

export default function Testimonials() {
  const [cardSize, setCardSize] = useState(365)
  const [list, setList] = useState(testimonials)

  const handleMove = (steps: number) => {
    const newList = [...list]
    if (steps > 0) {
      for (let i = steps; i > 0; i--) {
        const item = newList.shift()
        if (!item) return
        newList.push({ ...item, tempId: Math.random() })
      }
    } else {
      for (let i = steps; i < 0; i++) {
        const item = newList.pop()
        if (!item) return
        newList.unshift({ ...item, tempId: Math.random() })
      }
    }
    setList(newList)
  }

  useEffect(() => {
    const update = () => setCardSize(window.matchMedia('(min-width: 640px)').matches ? 365 : 290)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return (
    <section className="py-16">
      <div className="text-center mb-4 px-4">
        <span className="text-primary font-semibold text-sm uppercase tracking-wider">
          Real results
        </span>
        <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-4">
          Field teams love PilotWork
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Click any card to browse — or use the arrows below.
        </p>
      </div>

      <div className="relative w-full overflow-hidden bg-muted/30" style={{ height: 600 }}>
        {list.map((testimonial, index) => {
          const position = list.length % 2
            ? index - (list.length + 1) / 2
            : index - list.length / 2
          return (
            <TestimonialCard
              key={testimonial.tempId}
              testimonial={testimonial}
              handleMove={handleMove}
              position={position}
              cardSize={cardSize}
            />
          )
        })}

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          <button
            onClick={() => handleMove(-1)}
            className={cn(
              'flex h-14 w-14 items-center justify-center text-2xl transition-colors',
              'bg-background border-2 border-border hover:bg-primary hover:text-primary-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
            aria-label="Previous testimonial"
          >
            <ChevronLeft />
          </button>
          <button
            onClick={() => handleMove(1)}
            className={cn(
              'flex h-14 w-14 items-center justify-center text-2xl transition-colors',
              'bg-background border-2 border-border hover:bg-primary hover:text-primary-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
            aria-label="Next testimonial"
          >
            <ChevronRight />
          </button>
        </div>
      </div>
    </section>
  )
}
