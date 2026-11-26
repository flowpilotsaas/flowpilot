'use client'

import React from 'react'
import type { Device as DeviceType, Call as CallType } from '@twilio/voice-sdk'

export type DialerState = 'idle' | 'loading' | 'connecting' | 'ringing' | 'in-call' | 'ended' | 'error'

export interface DialerContact { number: string; name?: string }

export interface UseDialerResult {
  state: DialerState
  errorMsg: string
  contact: DialerContact | null
  isMuted: boolean
  elapsed: number
  call: (contact: DialerContact, fromNumber: string) => Promise<void>
  hangUp: () => void
  toggleMute: () => void
  dismiss: () => void
}

export function useDialer(): UseDialerResult {
  const [state, setState]       = React.useState<DialerState>('idle')
  const [errorMsg, setErrorMsg] = React.useState('')
  const [contact, setContact]   = React.useState<DialerContact | null>(null)
  const [isMuted, setIsMuted]   = React.useState(false)
  const [elapsed, setElapsed]   = React.useState(0)

  const deviceRef    = React.useRef<DeviceType | null>(null)
  const callRef      = React.useRef<CallType | null>(null)
  const timerRef     = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = React.useRef<number>(0)

  const stopTimer = React.useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setElapsed(0)
  }, [])

  const startTimer = React.useCallback(() => {
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(
      () => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)),
      1000,
    )
  }, [])

  React.useEffect(() => {
    return () => {
      stopTimer()
      callRef.current?.disconnect()
      deviceRef.current?.destroy()
    }
  }, [stopTimer])

  const fetchToken = async (): Promise<string> => {
    const res = await fetch('/api/twilio/voice-token')
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Failed to get calling token')
    return data.token
  }

  const getOrCreateDevice = async (): Promise<DeviceType> => {
    if (deviceRef.current) {
      try { deviceRef.current.updateToken(await fetchToken()) } catch {}
      return deviceRef.current
    }

    const token = await fetchToken()
    const { Device } = await import('@twilio/voice-sdk')
    const device = new Device(token)

    device.on('tokenWillExpire', async () => {
      try { device.updateToken(await fetchToken()) } catch (e) {
        console.error('[useDialer] token refresh failed', e)
      }
    })

    device.on('error', (err: Error) => {
      console.error('[useDialer] device error', err)
      setErrorMsg(err.message)
      setState('error')
      stopTimer()
    })

    deviceRef.current = device
    return device
  }

  const call = async (c: DialerContact, fromNumber: string) => {
    setState('loading')
    setContact(c)
    setIsMuted(false)
    setErrorMsg('')
    try {
      // Ask for microphone only when the user initiates a call
      await navigator.mediaDevices.getUserMedia({ audio: true })

      const device = await getOrCreateDevice()
      setState('connecting')

      const conn = await device.connect({ params: { To: c.number, From: fromNumber } })
      callRef.current = conn

      conn.on('ringing',    ()                 => setState('ringing'))
      conn.on('accept',     ()                 => { setState('in-call'); startTimer() })
      conn.on('disconnect', ()                 => { setState('ended');   stopTimer()  })
      conn.on('cancel',     ()                 => { setState('ended');   stopTimer()  })
      conn.on('error',      (err: Error)       => { setErrorMsg(err.message); setState('error'); stopTimer() })
      conn.on('mute',       (muted: boolean)   => setIsMuted(muted))
    } catch (err) {
      const msg = (err as Error).message
      setErrorMsg(msg.toLowerCase().includes('permission') ? 'Microphone access was denied.' : msg)
      setState('error')
    }
  }

  const hangUp = () => {
    callRef.current?.disconnect()
    callRef.current = null
    stopTimer()
    setState('ended')
  }

  const toggleMute = () => {
    if (!callRef.current) return
    const next = !isMuted
    callRef.current.mute(next)
    setIsMuted(next)
  }

  const dismiss = () => {
    setState('idle')
    setContact(null)
    setErrorMsg('')
    setElapsed(0)
  }

  return { state, errorMsg, contact, isMuted, elapsed, call, hangUp, toggleMute, dismiss }
}

export function fmtElapsed(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}
