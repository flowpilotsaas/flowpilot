import { type NextRequest } from 'next/server'
import { getAppUrl } from './app-url'

/** Parse a Twilio form-encoded body, validate the signature, and return the params.
 *  Returns null if the signature is invalid or Twilio env vars are missing. */
export async function parseTwilioWebhook(
  req: NextRequest,
): Promise<Record<string, string> | null> {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) return null

  const signature = req.headers.get('x-twilio-signature') ?? ''

  const rawBody = await req.text()
  const params: Record<string, string> = {}
  for (const [k, v] of new URLSearchParams(rawBody)) {
    params[k] = v
  }

  // The URL Twilio signed must exactly match the one we configured.
  // Use NEXT_PUBLIC_APP_URL so it matches the production domain Twilio knows.
  const url = getAppUrl() + new URL(req.url).pathname

  const tw = await import('twilio')
  // validateRequest is a named export in twilio v5/v6
  const validateRequest: (a: string, s: string, u: string, p: Record<string, string>) => boolean =
    (tw as unknown as Record<string, unknown>).validateRequest as typeof validateRequest
    ?? (tw.default as unknown as Record<string, unknown>).validateRequest as typeof validateRequest

  if (typeof validateRequest !== 'function') {
    console.error('[twilio-validate] validateRequest not found on twilio module')
    return null
  }

  return validateRequest(authToken, signature, url, params) ? params : null
}
