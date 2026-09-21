import { Suspense } from 'react'
import AuthForm from '@/components/Auth/AuthForm'

export const metadata = { title: 'Sign in — PilotWork' }

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  )
}
