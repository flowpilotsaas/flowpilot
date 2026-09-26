import { Suspense } from 'react'
import AuthForm from '@/components/Auth/AuthForm'

export const metadata = { title: 'Create your account — Jobigram' }

export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  )
}
