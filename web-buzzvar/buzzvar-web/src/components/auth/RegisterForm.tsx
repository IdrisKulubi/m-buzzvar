'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthContext } from './AuthProvider'
import { signUpWithEmailAction } from '@/lib/actions/auth-actions'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

export function RegisterForm() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isEmailLoading, setIsEmailLoading] = useState(false)
  const { signInWithGoogle } = useAuthContext()

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true)
      await signInWithGoogle()
    } catch (error) {
      console.error('Sign up error:', error)
      setIsGoogleLoading(false)
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign up with Google'
      alert(`Sign-up failed: ${errorMessage}`)
    }
  }

  const handleEmailSignUp = async (formData: FormData) => {
    setIsEmailLoading(true)
    try {
      const email = formData.get('email') as string
      const password = formData.get('password') as string
      const name = formData.get('name') as string
      
      const result = await signUpWithEmailAction(email, password, name)
      
      if (result?.error) {
        alert(`Sign-up failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Email sign up error:', error)
      alert('Failed to sign up with email')
    } finally {
      setIsEmailLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
        <CardDescription>
          Sign up to get started with Buzzvar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email Sign Up Form */}
        <form action={handleEmailSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Enter your full name"
              required
              disabled={isEmailLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              required
              disabled={isEmailLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Create a password"
              required
              disabled={isEmailLoading}
              minLength={8}
            />
          </div>
          <Button 
            type="submit"
            disabled={isEmailLoading || isGoogleLoading}
            className="w-full"
            size="lg"
          >
            {isEmailLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        {/* Google Sign Up */}
        <Button 
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isEmailLoading}
          variant="outline"
          className="w-full"
          size="lg"
        >
          {isGoogleLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing up...
            </>
          ) : (
            <>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </>
          )}
        </Button>
        
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Already have an account?{' '}
            <Link href="/login" className="underline underline-offset-4 hover:text-primary">
              Sign in
            </Link>
          </p>
        </div>
        
        <div className="text-center text-sm text-muted-foreground">
          <p>
            By signing up, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}