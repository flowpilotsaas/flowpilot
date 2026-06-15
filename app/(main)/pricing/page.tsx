import { PricingSection } from '@/components/ui/pricing';

export const metadata = { title: 'Pricing — PilotWork' };

const PLANS = [
  {
    name: 'Starter',
    info: 'For small teams getting started',
    price: {
      monthly: 29,
      yearly: Math.round(29 * 12 * (1 - 0.2)),
    },
    features: [
      { text: 'Up to 5 users' },
      { text: 'Job scheduling & calendar' },
      { text: 'Customer database' },
      { text: 'Mobile app for technicians' },
      { text: 'Basic invoicing' },
      { text: 'Email support' },
    ],
    btn: { text: 'Start free trial', href: '/signup' },
    highlighted: false,
  },
  {
    name: 'Pro',
    info: 'For growing field service businesses',
    price: {
      monthly: 59,
      yearly: Math.round(59 * 12 * (1 - 0.2)),
    },
    features: [
      { text: 'Unlimited users' },
      {
        text: 'Dispatching & route optimization',
        tooltip: 'AI-powered routing to minimize drive time between jobs',
      },
      { text: 'Recurring jobs & service plans' },
      { text: 'Quotes & estimates' },
      {
        text: 'Online payments',
        tooltip: 'Accept credit cards, ACH, and Apple Pay directly from invoices',
      },
      { text: 'QuickBooks integration' },
      { text: 'Priority support' },
    ],
    btn: { text: 'Start free trial', href: '/signup' },
    highlighted: true,
  },
  {
    name: 'Enterprise',
    info: 'For enterprise teams',
    price: {
      monthly: 0,
      yearly: 0,
    },
    features: [
      { text: 'Everything in Pro' },
      { text: 'Custom integrations' },
      { text: 'Dedicated account manager' },
      { text: 'Onboarding & training' },
      {
        text: 'SLA guarantees',
        tooltip: '99.9% uptime SLA with credits issued for any downtime',
      },
      { text: 'Advanced reporting & analytics' },
      {
        text: 'SSO / SAML',
        tooltip: 'Single sign-on with your existing identity provider (Okta, Azure AD, etc.)',
      },
    ],
    btn: { text: 'Contact sales', href: '/contact' },
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-24 px-4">
      <PricingSection
        heading="Pricing that scales with your team"
        description="Start free for 14 days. No credit card required. Per-user pricing that grows with your business."
        plans={PLANS}
      />
    </div>
  );
}
