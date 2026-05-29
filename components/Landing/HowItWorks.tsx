'use client'

import { Steps } from '@ark-ui/react/steps'
import { Check } from 'lucide-react'

const steps = [
  {
    title: 'Connect your team',
    content:
      'Sign up in minutes. Add your technicians, set your service areas, and configure your job types. No lengthy onboarding — most teams are live and dispatching on day one.',
  },
  {
    title: 'Schedule jobs',
    content:
      'Drag new work orders onto a live calendar and assign them to available techs. Flow Pilot flags conflicts, suggests optimal routes, and keeps your schedule airtight.',
  },
  {
    title: 'Dispatch to the field',
    content:
      "Your techs get an instant push notification with the job address, customer notes, and any attached photos. No calls, no texts — everything they need, right in the app.",
  },
  {
    title: 'Invoice and get paid',
    content:
      'The moment a tech marks a job done, Flow Pilot generates the invoice automatically. Send it instantly via email or SMS and accept card payments online — from the job site.',
  },
]

export default function HowItWorks() {
  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Getting started
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-4">
            Up and running in four steps
          </h2>
          <p className="text-muted-foreground text-lg">
            From sign-up to your first dispatched job in under an hour.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 w-full px-4 py-12 rounded-xl">
          <Steps.Root count={steps.length} defaultStep={0} className="w-full">
            {/* Step indicators */}
            <Steps.List className="flex justify-between items-center">
              {steps.map((step, index) => (
                <Steps.Item
                  key={index}
                  index={index}
                  className="relative flex not-last:flex-1 items-center"
                >
                  <Steps.Trigger className="flex items-center gap-3 text-left rounded-md group">
                    <Steps.Indicator className="flex justify-center items-center shrink-0 rounded-full font-semibold w-8 h-8 text-sm border-2 data-[state=complete]:bg-primary data-[state=complete]:text-primary-foreground data-[state=complete]:border-primary data-[state=current]:bg-primary data-[state=current]:text-primary-foreground data-[state=current]:border-primary data-[state=incomplete]:bg-gray-100 data-[state=incomplete]:text-gray-500 data-[state=incomplete]:border-gray-200 dark:data-[state=incomplete]:bg-gray-700 dark:data-[state=incomplete]:text-gray-300 dark:data-[state=incomplete]:border-gray-600 relative">
                      <span className="group-data-[state=complete]:hidden">{index + 1}</span>
                      <Check className="w-4 h-4 hidden group-data-[state=complete]:block" />
                    </Steps.Indicator>
                  </Steps.Trigger>
                  <Steps.Separator
                    hidden={index === steps.length - 1}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 h-0.5 mx-3 data-[state=complete]:bg-primary"
                  />
                </Steps.Item>
              ))}
            </Steps.List>

            {/* Step content panel */}
            <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg min-h-[120px]">
              {steps.map((step, index) => (
                <Steps.Content key={index} index={index} className="text-gray-700 dark:text-gray-300">
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                    {step.title}
                  </h3>
                  <p>{step.content}</p>
                </Steps.Content>
              ))}

              <Steps.CompletedContent className="text-center p-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    You're ready to roll!
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your team is dispatched, jobs are rolling in, and invoices go out automatically.
                    Welcome to Flow Pilot.
                  </p>
                </div>
              </Steps.CompletedContent>
            </div>

            {/* Prev / Next controls */}
            <div className="flex justify-between items-center mt-6">
              <Steps.PrevTrigger className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700">
                Back
              </Steps.PrevTrigger>
              <Steps.NextTrigger className="px-4 py-2 text-sm font-medium text-white bg-primary border border-primary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
                Next step
              </Steps.NextTrigger>
            </div>
          </Steps.Root>
        </div>
      </div>
    </section>
  )
}
