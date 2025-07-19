import { redirect } from 'next/navigation'

export default function RegisterPage() {
  // Since we're using Google OAuth, redirect to login
  redirect('/login')
}