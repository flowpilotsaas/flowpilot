import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { resend } from '@/lib/resend'
import { checkWriteAccess } from '@/lib/trial-gate'

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Jobigram <onboarding@resend.dev>'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const access = await checkWriteAccess(supabase, user.id)
  if (!access.allowed) {
    return Response.json({ error: access.message, code: access.code }, { status: 402 })
  }

  try {
    const { to, subject, body } = await req.json()
    if (!to?.trim() || !subject?.trim() || !body?.trim()) {
      return Response.json({ error: 'to, subject, and body are required.' }, { status: 400 })
    }

    const { error } = await resend.emails.send({
      from: FROM,
      to: [to.trim()],
      subject: subject.trim(),
      text: body.trim(),
    })

    if (error) throw new Error(error.message)
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[email/send]', err)
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
