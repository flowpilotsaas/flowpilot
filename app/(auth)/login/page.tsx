import { Suspense } from 'react'
import AuthForm from '@/components/Auth/AuthForm'

export const metadata = { title: 'Sign in — Jobigram' }

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  )
}
