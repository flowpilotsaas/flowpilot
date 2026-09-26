import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { checkWriteAccess } from '@/lib/trial-gate'

const FROM    = process.env.RESEND_FROM_EMAIL ?? 'Jobigram <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.jobigram.com'

// User cap per plan name — must match billing page feature copy exactly
const PLAN_CAPS: Record<string, number> = {
  Kickstart:    2,
  Standard:     5,
  Business:    10,
  Professional: 20,
  Growth:       50,
  Enterprise:   10_000,
}

function buildInviteHtml(role: string) {
  const roleLabel = role === 'admin' ? 'Admin' : 'Technician'
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>You've been invited to Jobigram</title>
<style>
  body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#18181b;}
  .wrapper{max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);}
  .header{background:#18181b;padding:28px 40px;}
  .header h1{margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-.5px;}
  .body{padding:36px 40px;}
  .body p{margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;}
  .footer{background:#f4f4f5;padding:20px 40px;text-align:center;font-size:12px;color:#a1a1aa;}
</style>
</head>
<body>
<div class="wrapper">
  <div class="header"><h1>Jobigram</h1></div>
  <div class="body">
    <p>You&rsquo;ve been invited to join a Jobigram organization as a <strong>${roleLabel}</strong>.</p>
    <p>Sign up or log in using this email address to automatically join the organization.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
      <tr>
        <td align="center">
          <a href="${APP_URL}/signup" style="display:inline-block;background:#18181b;color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:6px;">Accept Invitation</a>
        </td>
      </tr>
    </table>
    <p style="font-size:13px;color:#a1a1aa;">If you didn&rsquo;t expect this invitation, you can safely ignore this email.</p>
  </div>
  <div class="footer">Powered by <strong>Jobigram</strong> &middot; Field Service Management</div>
</div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await checkWriteAccess(supabase, user.id)
  if (!access.allowed) {
    return Response.json({ error: access.message, code: access.code }, { status: 402 })
  }

  const { email, role } = await req.json().catch(() => ({}))
  if (!email) return Response.json({ error: 'Missing email' }, { status: 400 })

  // ── Resolve org and verify invoker has permission to invite ──────────────
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!membership) return Response.json({ error: 'You are not a member of any organization.' }, { status: 403 })
  if (membership.role === 'technician') return Response.json({ error: 'You do not have permission to invite members.' }, { status: 403 })

  const orgId = membership.organization_id

  // ── Check whether this is a resend (pending row already exists) ──────────
  // If it is, skip the cap check and DB insert — just resend the email.
  const { data: existing } = await supabase
    .from('organization_members')
    .select('id, status')
    .eq('organization_id', orgId)
    .eq('email', email)
    .maybeSingle()

  if (existing?.status === 'active') {
    return Response.json({ error: 'This person is already a member.' }, { status: 409 })
  }

  const isResend = existing?.status === 'pending'

  if (!isResend) {
    // ── New invite: enforce plan cap ───────────────────────────────────────

    // Subscriptions are keyed by the org owner's user_id
    const { data: org } = await supabase
      .from('organizations')
      .select('owner_id')
      .eq('id', orgId)
      .maybeSingle()

    const { data: sub } = org
      ? await supabase
          .from('subscriptions')
          .select('plan_name, status')
          .eq('user_id', org.owner_id)
          .maybeSingle()
      : { data: null }

    const isActiveSub = sub?.status === 'active' || sub?.status === 'trialing'

    if (!sub || !isActiveSub) {
      return Response.json({
        error: 'No active subscription. Please choose a plan before inviting team members.',
        code: 'no_subscription',
      }, { status: 402 })
    }

    const cap = PLAN_CAPS[sub.plan_name ?? ''] ?? 0

    const { count } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .in('status', ['active', 'pending'])

    if ((count ?? 0) >= cap) {
      return Response.json({
        error: `You've reached your plan's user limit (${cap} user${cap !== 1 ? 's' : ''}). Upgrade your plan to add more team members.`,
        code: 'plan_limit',
        cap,
      }, { status: 402 })
    }

    // ── Insert the pending invite row ──────────────────────────────────────
    const { error: insertError } = await supabase
      .from('organization_members')
      .insert({ organization_id: orgId, email, role: role ?? 'technician', status: 'pending' })

    if (insertError) return Response.json({ error: insertError.message }, { status: 500 })
  }

  // ── Send invite email ────────────────────────────────────────────────────
  if (!process.env.RESEND_API_KEY) {
    // Row was inserted (or already existed for a resend), but email won't go out
    return Response.json({ ok: true, emailWarning: 'Email not configured.' })
  }

  try {
    const { Resend } = await import('resend')
    const client = new Resend(process.env.RESEND_API_KEY)
    await client.emails.send({
      from:    FROM,
      to:      email,
      subject: "You've been invited to join Jobigram",
      html:    buildInviteHtml(role ?? 'technician'),
    })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ ok: true, emailWarning: (err as Error).message })
  }
}
