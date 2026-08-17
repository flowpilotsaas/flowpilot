# PilotWork — Roadmap

## Deployment Checklist (needs live URL)

### Scheduled Emails (need cron job)
- [ ] Job reminder email — 24hrs before scheduled appointment
- [ ] Agreement expiring soon reminder email
- [ ] Technician on the way notification email

### Stripe
- [ ] Switch to live keys (sk_live_, pk_live_)
- [ ] Set up live webhook endpoint pointing to https://yourapp.com/api/stripe/webhook
- [ ] Test Sunbit financing appears on real Stripe Checkout

### Resend Email
- [ ] Verify pilotwork.com domain in Resend dashboard
- [ ] Add RESEND_FROM_EMAIL=noreply@pilotwork.com to production env vars

### Wisetack
- [ ] Receive partner API credentials from Wisetack
- [ ] Replace placeholder financing UI with real Wisetack API calls

## In Progress
- Pipeline page (/dashboard/pipeline)

## Completed ✅
- Full CRUD: Customers, Jobs, Estimates, Pricebook, Team, Inventory, Company Equipment, Transactions, Agreements
- Stripe billing with 6 subscription tiers
- Sunbit financing via Stripe Checkout on estimates
- Wisetack financing placeholder on estimates
- Email notifications (estimate sent/approved/declined, job confirmation/completion, payment received, payment link sent, agreement sent)
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
- Actually sending email invites to staff and technicians
- Technicians logging in with their own separate accounts
-

### Twilio
- [ ] Upgrade Twilio account to enable phone number search and purchase
- [ ] Test Communications page — Phone Numbers tab (buy numbers by area code)
- [ ] Test Communications page — Texting tab (send SMS to customers)
- [ ] Add Twilio Voice SDK for browser-based calling (Quick Call feature)