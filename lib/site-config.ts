/**
 * Online card payment is built (Stripe Connect + estimate pay route) but not yet
 * proven live in production. Set to true when you've done an end-to-end live payment
 * test and are ready to surface it in marketing copy and the demo.
 *
 * When false:
 *  - hero copy and headline do not mention paying online
 *  - the hero demo has no "Payment received" step
 *  - feature cards show "coming soon" for online payments
 *
 * When true:
 *  - all of the above restore automatically, no other edits needed
 */
export const ONLINE_PAYMENTS_LIVE = false
