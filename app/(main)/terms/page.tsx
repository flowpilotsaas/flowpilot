import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Jobigram',
  description: 'Terms governing your use of the Jobigram field service management platform.',
}

export default function TermsPage() {
  return (
    <section className="px-6 pb-24 pt-36 sm:pt-44">
      <div className="mx-auto" style={{ maxWidth: 680 }}>

        <h1 className="mb-4 text-4xl font-bold text-foreground sm:text-5xl">
          Terms of Service
        </h1>

        <p className="mb-10 text-sm text-muted-foreground">Last updated: November 2026</p>

        <p className="mb-8 text-base leading-relaxed text-muted-foreground">
          Jobigram is operated by <span className="font-semibold text-foreground">Net Choice Inc.</span> These
          Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the Jobigram platform. By
          creating an account or using the service, you agree to these Terms. If you do not agree, do not use
          the service.
        </p>

        {[
          {
            heading: 'The service',
            body: (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Jobigram is a software-as-a-service platform for field service businesses. It provides tools
                for creating estimates, scheduling jobs, managing customers, and sending communications to
                your customers. We grant you a limited, non-exclusive, non-transferable right to access and
                use the service for your internal business purposes during your subscription.
              </p>
            ),
          },
          {
            heading: 'Accounts',
            body: (
              <p className="text-sm leading-relaxed text-muted-foreground">
                You must provide accurate information when creating an account and keep it up to date. You are
                responsible for maintaining the security of your account credentials and for all activity that
                occurs under your account. Notify us immediately at{' '}
                <a href="mailto:flowpilotsaas@gmail.com" className="text-primary hover:underline">
                  flowpilotsaas@gmail.com
                </a>{' '}
                if you believe your account has been compromised.
              </p>
            ),
          },
          {
            heading: 'Acceptable use',
            body: (
              <>
                <p className="mb-3 text-sm leading-relaxed text-muted-foreground">You agree not to:</p>
                <ul className="space-y-2 pl-4">
                  {[
                    'Use the service to send unsolicited commercial messages (spam).',
                    'Send SMS messages to recipients who have not consented to receive them from your business.',
                    'Violate any applicable law, including consumer protection, privacy, and anti-spam laws.',
                    'Reverse-engineer, decompile, or attempt to extract the source code of the platform.',
                    'Resell or sublicense access to the platform without our written permission.',
                    'Upload or transmit malicious code or interfere with the integrity of the service.',
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
            heading: 'SMS and communications',
            body: (
              <p className="text-sm leading-relaxed text-muted-foreground">
                You are solely responsible for ensuring you have appropriate consent from your customers
                before sending them SMS or email messages through Jobigram. Messages are sent on behalf of
                your business to your own customers. Message and data rates may apply to recipients. Recipients
                may reply <strong className="text-foreground">STOP</strong> to opt out of messages from your
                business, or <strong className="text-foreground">HELP</strong> for assistance. You must honor
                opt-out requests and must not use the platform to send messages to individuals who have
                opted out.
              </p>
            ),
          },
          {
            heading: 'Payment and billing',
            body: (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Paid plans are billed monthly or annually as selected. All fees are charged in advance and
                are non-refundable except where required by law. We reserve the right to change pricing with
                30 days&apos; notice. If payment fails, we may suspend access to the service until payment
                is resolved. You can cancel your subscription at any time; your access continues until the
                end of the paid period.
              </p>
            ),
          },
          {
            heading: 'Your data',
            body: (
              <p className="text-sm leading-relaxed text-muted-foreground">
                You retain ownership of all data you enter into Jobigram, including customer records, job
                data, and estimates. You grant us a limited license to store and process that data solely
                to provide the service. We do not sell your data or your customers&apos; data. See our{' '}
                <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a> for details.
              </p>
            ),
          },
          {
            heading: 'Intellectual property',
            body: (
              <p className="text-sm leading-relaxed text-muted-foreground">
                The Jobigram platform, including its software, design, and content, is owned by Net Choice Inc.
                and protected by intellectual property laws. These Terms do not grant you any rights to our
                trademarks, logos, or brand assets.
              </p>
            ),
          },
          {
            heading: 'Disclaimer of warranties',
            body: (
              <p className="text-sm leading-relaxed text-muted-foreground">
                The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties
                of any kind, express or implied. We do not warrant that the service will be uninterrupted,
                error-free, or free of harmful components. Your use of the service is at your own risk.
              </p>
            ),
          },
          {
            heading: 'Limitation of liability',
            body: (
              <p className="text-sm leading-relaxed text-muted-foreground">
                To the maximum extent permitted by law, Net Choice Inc. shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages, including loss of profits or data,
                arising from your use of or inability to use the service. Our total liability for any claim
                shall not exceed the amount you paid us in the three months preceding the claim.
              </p>
            ),
          },
          {
            heading: 'Termination',
            body: (
              <p className="text-sm leading-relaxed text-muted-foreground">
                You may cancel your account at any time. We may suspend or terminate your account if you
                violate these Terms or if we decide to discontinue the service, with reasonable notice where
                practicable. Upon termination, your right to access the service ends and we may delete your
                data in accordance with our Privacy Policy.
              </p>
            ),
          },
          {
            heading: 'Changes to these Terms',
            body: (
              <p className="text-sm leading-relaxed text-muted-foreground">
                We may update these Terms from time to time. We will notify you by email or by a notice
                within the application at least 14 days before material changes take effect. Continued use
                after the effective date constitutes acceptance of the revised Terms.
              </p>
            ),
          },
          {
            heading: 'Governing law',
            body: (
              <p className="text-sm leading-relaxed text-muted-foreground">
                These Terms are governed by the laws of the State of Delaware, without regard to conflict
                of law principles. Any disputes shall be resolved in the courts of Delaware.
              </p>
            ),
          },
          {
            heading: 'Contact',
            body: (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Questions about these Terms?{' '}
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
