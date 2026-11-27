import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Jobigram',
  description: 'How Jobigram collects, uses, and protects your information.',
}

export default function PrivacyPage() {
  return (
    <section className="px-6 pb-24 pt-36 sm:pt-44">
      <div className="mx-auto" style={{ maxWidth: 680 }}>

        <h1 className="mb-4 text-4xl font-bold text-foreground sm:text-5xl">
          Privacy Policy
        </h1>

        <p className="mb-10 text-sm text-muted-foreground">Last updated: November 2026</p>

        <p className="mb-8 text-base leading-relaxed text-muted-foreground">
          Jobigram is operated by <span className="font-semibold text-foreground">Net Choice Inc.</span> This
          Privacy Policy explains what information we collect when you use Jobigram, how we use it, and your
          rights regarding that information. By using the service you agree to this policy.
        </p>

        {[
          {
            heading: 'Information we collect',
            body: (
              <>
                <p className="mb-3">We collect information you provide directly when you create an account, add customers, or contact us. This includes:</p>
                <ul className="space-y-2 pl-4">
                  {[
                    'Account information: name, email address, and password.',
                    'Business information: your company name, team members you invite, and billing details processed by Stripe.',
                    'Customer records: names, phone numbers, email addresses, and service addresses you enter for your customers.',
                    'Job and estimate data: descriptions, line items, scheduled dates, and status updates you create.',
                    'Usage data: pages visited, features used, and error logs collected automatically to help us improve the product.',
                    'Device and browser information: IP address, browser type, and operating system collected automatically.',
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed">
                      <span className="mt-0.5 shrink-0 text-primary">—</span>
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </>
            ),
          },
          {
            heading: 'How we use your information',
            body: (
              <ul className="space-y-2 pl-4">
                {[
                  'To provide and operate the Jobigram service.',
                  'To send transactional messages — estimate notifications, job confirmations, reminders, and payment receipts — to your customers on your behalf.',
                  'To process payments through Stripe.',
                  'To send you product updates, usage summaries, and support communications.',
                  'To diagnose technical problems and improve reliability.',
                  'To comply with legal obligations.',
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed">
                    <span className="mt-0.5 shrink-0 text-primary">—</span>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            ),
          },
          {
            heading: 'SMS messaging',
            body: (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Jobigram enables businesses to send text messages to their own customers — for example, job
                reminders, confirmations, and payment links. Messages are sent on behalf of the business using the
                service. Message frequency varies depending on the business&apos;s activity. Message and data rates
                may apply. Recipients can reply <strong className="text-foreground">STOP</strong> at any time to
                opt out of messages from that business, or <strong className="text-foreground">HELP</strong> for
                assistance. Opt-out requests are honored immediately. No mobile opt-in data or consent is shared
                with third parties for marketing purposes.
              </p>
            ),
          },
          {
            heading: 'Information sharing',
            body: (
              <>
                <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                  We do not sell your personal information. We share data only as needed to operate the service:
                </p>
                <ul className="space-y-2 pl-4">
                  {[
                    'Stripe — payment processing.',
                    'Supabase — database and authentication infrastructure.',
                    'Twilio — SMS and voice communications.',
                    'Resend — transactional email.',
                    'Vercel — hosting and infrastructure.',
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed">
                      <span className="mt-0.5 shrink-0 text-primary">—</span>
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  We may also disclose information if required by law or to protect our rights.
                </p>
              </>
            ),
          },
          {
            heading: 'Data retention',
            body: (
              <p className="text-sm leading-relaxed text-muted-foreground">
                We retain your account data for as long as your account is active. If you delete your account,
                we will delete or anonymize your data within 30 days except where we are required to retain it
                for legal or billing purposes.
              </p>
            ),
          },
          {
            heading: 'Security',
            body: (
              <p className="text-sm leading-relaxed text-muted-foreground">
                We use industry-standard practices including encrypted connections (HTTPS), hashed passwords,
                and row-level security on the database. No method of transmission over the internet is completely
                secure, and we cannot guarantee absolute security.
              </p>
            ),
          },
          {
            heading: 'Your rights',
            body: (
              <p className="text-sm leading-relaxed text-muted-foreground">
                You may request access to, correction of, or deletion of your personal data at any time by
                contacting us. If you are a customer of a business using Jobigram and wish to have your data
                removed, please contact that business directly or reach us and we will assist.
              </p>
            ),
          },
          {
            heading: 'Changes to this policy',
            body: (
              <p className="text-sm leading-relaxed text-muted-foreground">
                We may update this policy from time to time. We will post the revised policy on this page with
                an updated date. Continued use of the service after changes are posted constitutes acceptance
                of the revised policy.
              </p>
            ),
          },
          {
            heading: 'Contact',
            body: (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Questions about this policy?{' '}
                <a href="mailto:flowpilotsaas@gmail.com" className="text-primary hover:underline">
                  flowpilotsaas@gmail.com
                </a>
              </p>
            ),
          },
        ].map(({ heading, body }) => (
          <div key={heading} className="mb-10">
            <h2 className="mb-3 text-xl font-bold text-foreground">{heading}</h2>
            {body}
          </div>
        ))}

      </div>
    </section>
  )
}
