'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function AuthCodeErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'access_denied':
        return 'You denied access to your Google account. Please try again and allow access to continue.'
      case 'no_code':
        return 'No authorization code was received from Google. Please try signing in again.'
      case 'unexpected_error':
        return 'An unexpected error occurred during authentication. Please try again.'
      default:
        return 'There was an error processing your authentication request. This could be due to an expired or invalid authentication code.'
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-red-600">Authentication Error</CardTitle>
          <CardDescription>
            Unable to complete sign-in process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}
          
          <p className="text-sm text-muted-foreground text-center">
            {getErrorMessage(error)}
          </p>
          
          <div className="flex justify-center">
            <Button asChild>
              <Link href="/login">
                Try Again
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}