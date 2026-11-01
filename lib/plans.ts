/** Trial length in days — single source of truth used by trial-gate, marketing pages, and auth copy. */
export const TRIAL_DAYS = 30

export type Plan = {
  name: string
  price: number
  /** Max active+pending team members enforced by the invite route */
  cap: number
  features: string[]
  highlight?: boolean
}

/** Used by app/api/stripe/create-checkout-session — price in USD per month */
export const PLAN_PRICES: Record<string, number> = {
  Kickstart:    49,
  Standard:     99,
  Business:    149,
  Professional: 199,
  Growth:       299,
  Enterprise:   499,
}

/** Used by app/api/team/invite — max active+pending members per plan */
export const PLAN_CAPS: Record<string, number> = {
  Kickstart:    2,
  Standard:     5,
  Business:    10,
  Professional: 20,
  Growth:       50,
  Enterprise:   10_000,
}

/** Canonical plan list used by billing page, pricing page, and homepage preview */
export const PLANS: Plan[] = [
  {
    name: 'Kickstart',
    price: 49,
    cap: 2,
    features: [
      'Up to 2 team members',
      'Job scheduling & calendar',
      'Customer database',
      'Estimates with online approval',
      'Email reminders',
    ],
  },
  {
    name: 'Standard',
    price: 99,
    cap: 5,
    features: [
      'Up to 5 team members',
      'Job scheduling & dispatch',
      'Customer database',
      'Estimates with online approval',
      'Email reminders',
      'Basic reporting',
    ],
  },
  {
    name: 'Business',
    price: 149,
    cap: 10,
    features: [
      'Up to 10 team members',
      'Everything in Standard',
      'Online payments via Stripe',
      'SMS reminders & calling',
      'Pricebook & service agreements',
      'Inventory management',
    ],
    highlight: true,
  },
  {
    name: 'Professional',
    price: 199,
    cap: 20,
    features: [
      'Up to 20 team members',
      'Everything in Business',
      'Pipeline & leads hub',
      'Equipment management',
      'Advanced reports',
    ],
  },
  {
    name: 'Growth',
    price: 299,
    cap: 50,
    features: [
      'Up to 50 team members',
      'Everything in Professional',
      'Tech live map',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    price: 499,
    cap: 10_000,
    features: [
      'Unlimited team members',
      'Everything in Growth',
      'Dedicated onboarding',
      'Custom integrations',
    ],
  },
]
