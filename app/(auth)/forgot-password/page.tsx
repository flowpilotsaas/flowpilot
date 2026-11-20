import type { Metadata } from 'next'
import { Suspense } from 'react'
import ForgotPasswordForm from './ForgotPasswordForm'

export const metadata: Metadata = { title: 'Reset password — Jobigram' }

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  )
}
