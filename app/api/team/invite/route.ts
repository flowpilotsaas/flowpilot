import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

const FROM    = process.env.RESEND_FROM_EMAIL ?? 'PilotWork <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.pilotwork.com'

function buildInviteHtml(role: string) {
  const roleLabel = role === 'admin' ? 'Admin' : 'Technician'
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>You've been invited to PilotWork</title>
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
  <div class="header"><h1>PilotWork</h1></div>
  <div class="body">
    <p>You&rsquo;ve been invited to join a PilotWork organization as a <strong>${roleLabel}</strong>.</p>
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
  <div class="footer">Powered by <strong>PilotWork</strong> &middot; Field Service Management</div>
</div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'Email not configured.' }, { status: 500 })
  }

  try {
    const { email, role } = await req.json()
    if (!email) return Response.json({ error: 'Missing email' }, { status: 400 })

    const { Resend } = await import('resend')
    const client = new Resend(process.env.RESEND_API_KEY)
    await client.emails.send({
      from: FROM,
      to:   email,
      subject: "You've been invited to join PilotWork",
      html:    buildInviteHtml(role ?? 'technician'),
    })

    return Response.json({ ok: true })
  } catch (err) {
    const e = err as Error
    return Response.json({ error: e.message }, { status: 500 })
  }
}
