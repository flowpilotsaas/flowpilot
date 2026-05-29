import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function CTA() {
  return (
    <section className="py-20 px-4">
      <div className="mx-auto max-w-3xl text-center space-y-6">
        <h2 className="text-foreground text-balance text-3xl font-semibold lg:text-4xl">
          Stop juggling spreadsheets.<br />Start dispatching smarter.
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Join hundreds of field service teams already saving hours every week with Flow Pilot.
          No credit card required to get started.
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Button asChild size="lg">
            <Link href="/signup">Start free trial</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/demo">Book a demo</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
