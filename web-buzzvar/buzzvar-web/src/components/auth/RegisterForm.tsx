'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function RegisterForm() {
  const router = useRouter()

  useEffect(() => {
    // Since we're using Google OAuth, redirect to login
    router.push('/login')
  }, [router])

  return null
}