import { Button } from '@/components/ui/button'
import Link from 'next/link'
import React from 'react'

interface CTAProps {
  heading?: React.ReactNode
  description?: string
  buttonText?: string
  buttonHref?: string
  secondaryButtonText?: string
  secondaryButtonHref?: string
  showSecondaryButton?: boolean
}

export default function CTA({
  heading = <>Stop juggling spreadsheets.<br />Start dispatching smarter.</>,
  description = 'Join hundreds of field service teams already saving hours every week with Flow Pilot. No credit card required to get started.',
  buttonText = 'Start free trial',
  buttonHref = '/signup',
  secondaryButtonText = 'Book a demo',
  secondaryButtonHref = '/demo',
  showSecondaryButton = true,
}: CTAProps) {
  return (
    <section className="py-20 px-4">
      <div className="mx-auto max-w-3xl text-center space-y-6">
        <h2 className="text-foreground text-balance text-3xl font-semibold lg:text-4xl">
          {heading}
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          {description}
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Button asChild size="lg">
            <Link href={buttonHref}>{buttonText}</Link>
          </Button>
          {showSecondaryButton && (
            <Button asChild variant="outline" size="lg">
              <Link href={secondaryButtonHref}>{secondaryButtonText}</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
