# PilotWork — Roadmap

## Deployment Checklist (needs live URL)

### Scheduled Emails (need cron job)
- [ ] Agreement expiring soon reminder email
- [ ] Technician on the way notification email

### Stripe
- [ ] Switch to live keys (sk_live_, pk_live_)
- [ ] Set up live webhook endpoint pointing to https://yourapp.com/api/stripe/webhook
- [ ] Test Sunbit financing appears on real Stripe Checkout

## Blocked

### Google Business Profile Integration
- Blocked on Google's external "Basic API Access" approval process
- Requirement: a verified Google Business Profile that's been active 60+ days with a website listed, before Google will even accept the application
- Next steps once ready: (1) create and verify a Business Profile for the company, (2) wait 60+ days, (3) submit "Application for Basic API Access" via Google's GBP API contact form, (4) wait for approval (historically 10-14+ business days), (5) then build OAuth connect flow + review sync (plan already scoped: needs google_business_connections and google_reviews tables, GOOGLE_CLIENT_ID/SECRET env vars)
- UI on the Google Business Profile dashboard page updated to show "Coming Soon" instead of non-functional buttons

## In Progress
- Pipeline page (/dashboard/pipeline)

## Completed ✅
- Full CRUD: Customers, Jobs, Estimates, Pricebook, Team, Inventory, Company Equipment, Transactions, Agreements
- Stripe billing with 6 subscription tiers
- Stripe webhook — fixed URL, signing secret, service role key, and table grants; fully tested with a real subscription
- Sunbit financing via Stripe Checkout on estimates
- Email notifications (estimate sent/approved/declined, job confirmation/completion, payment received, payment link sent, agreement sent) — all individually tested and confirmed delivered
- Resend domain verification — jobigram.com verified, RESEND_FROM_EMAIL set to noreply@jobigram.com
- Job reminder email (24hrs before appointment) — built via Vercel Cron, runs daily, confirmed deployed (not yet confirmed to have fired successfully in production, since it's on a daily schedule)
- Team invite email sending — confirmed working, invite received, RLS policies fixed
- /api/send-sms security — added auth check, closed the open endpoint
- Rebrand to PilotWork

## To Build

### Jobs
- Google Maps embed on job detail page (requires Google Maps API key)
- Visit history / technician check-in and check-out
- Invoice tab on job detail
- Billing tab on job detail
- Callback tracking
- Export jobs to CSV

### Estimates
- Customer-facing approval portal
- Digital signature capture

### Team
- Technicians logging in with their own separate accounts

### Twilio
- [ ] Upgrade Twilio account to enable phone number search and purchase
- [ ] Test Communications page — Phone Numbers tab (buy numbers by area code)
- [ ] Test Communications page — Texting tab (send SMS to customers)
- [ ] Add Twilio Voice SDK for browser-based calling (Quick Call feature)
