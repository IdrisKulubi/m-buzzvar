'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth/better-auth-client-web'

export default function AuthDebugPage() {
  const [config, setConfig] = useState<any>(null)
  const [authConfig, setAuthConfig] = useState<any>(null)

  useEffect(() => {
    const currentUrl = window.location.origin
    
    setConfig({
      authSystem: 'Better Auth',
      currentOrigin: currentUrl,
      expectedRedirectUrl: `${currentUrl}/api/auth/callback/google`,
      userAgent: navigator.userAgent,
      isLocalhost: currentUrl.includes('localhost'),
    })

    // Check auth configuration
    fetch('/api/debug/supabase')
      .then(res => res.json())
      .then(data => setAuthConfig(data))
      .catch(err => console.error('Failed to fetch auth config:', err))
  }, [])

  const testGoogleAuth = async () => {
    console.log('Testing Google Auth with Better Auth')
    
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/dashboard'
      })
    } catch (err) {
      console.error('Unexpected error:', err)
      alert(`Unexpected error: ${err}`)
    }
  }

  if (!config) {
    return <div>Loading debug info...</div>
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Debug Information</CardTitle>
          <CardDescription>
            Use this page to debug OAuth configuration issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Current Configuration</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Auth System:</strong> {config.authSystem}</div>
                <div><strong>Current Origin:</strong> {config.currentOrigin}</div>
                <div><strong>Expected Redirect URL:</strong> {config.expectedRedirectUrl}</div>
                <div><strong>Is Localhost:</strong> {config.isLocalhost ? 'Yes' : 'No'}</div>
              </div>
              
              {authConfig && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Auth Status</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Connection:</strong> {authConfig.success ? '✅ OK' : '❌ Failed'}</div>
                    <div><strong>Has Session:</strong> {authConfig.hasSession ? 'Yes' : 'No'}</div>
                    {authConfig.sessionUser && (
                      <div><strong>User:</strong> {authConfig.sessionUser.email}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Required Google OAuth Settings</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Authorized JavaScript origins:</strong></div>
                <div className="bg-muted p-2 rounded text-xs font-mono">
                  {config.currentOrigin}
                </div>
                <div><strong>Authorized redirect URIs:</strong></div>
                <div className="bg-muted p-2 rounded text-xs font-mono">
                  {config.expectedRedirectUrl}
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Better Auth Configuration</h3>
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Using Better Auth for authentication</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
                <li>Better Auth handles OAuth flows automatically</li>
                <li>Google OAuth is configured through environment variables</li>
                <li>Sessions are managed securely with cookies</li>
                <li>No additional configuration needed for web apps</li>
              </ol>
            </div>
            
            <h3 className="font-semibold mb-2">Google OAuth Setup:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
              <li>Find your OAuth 2.0 Client ID</li>
              <li>Add the "Authorized JavaScript origins" URL above</li>
              <li>Add the "Authorized redirect URIs" URL above</li>
              <li>Save the changes</li>
              <li>Test the authentication below</li>
            </ol>
          </div>
          
          <div className="border-t pt-4">
            <Button onClick={testGoogleAuth} className="w-full">
              Test Google Authentication
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}