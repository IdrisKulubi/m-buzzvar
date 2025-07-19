'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'

export default function AuthDebugPage() {
  const [config, setConfig] = useState<any>(null)
  const [supabaseConfig, setSupabaseConfig] = useState<any>(null)

  useEffect(() => {
    const supabase = createClient()
    const currentUrl = window.location.origin
    
    setConfig({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      currentOrigin: currentUrl,
      expectedRedirectUrl: `${currentUrl}/api/auth/callback`,
      userAgent: navigator.userAgent,
      isLocalhost: currentUrl.includes('localhost'),
    })

    // Check Supabase configuration
    fetch('/api/debug/supabase')
      .then(res => res.json())
      .then(data => setSupabaseConfig(data))
      .catch(err => console.error('Failed to fetch Supabase config:', err))
  }, [])

  const testGoogleAuth = async () => {
    const supabase = createClient()
    const currentUrl = window.location.origin
    const redirectUrl = `${currentUrl}/api/auth/callback`
    
    console.log('Testing Google Auth with redirect:', redirectUrl)
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      })

      if (error) {
        console.error('OAuth Error:', error)
        alert(`OAuth Error: ${error.message}`)
      }
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
                <div><strong>Supabase URL:</strong> {config.supabaseUrl}</div>
                <div><strong>Current Origin:</strong> {config.currentOrigin}</div>
                <div><strong>Expected Redirect URL:</strong> {config.expectedRedirectUrl}</div>
                <div><strong>Is Localhost:</strong> {config.isLocalhost ? 'Yes' : 'No'}</div>
              </div>
              
              {supabaseConfig && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Supabase Status</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Connection:</strong> {supabaseConfig.success ? '✅ OK' : '❌ Failed'}</div>
                    <div><strong>Has Session:</strong> {supabaseConfig.hasSession ? 'Yes' : 'No'}</div>
                    {supabaseConfig.sessionError && (
                      <div className="text-red-600"><strong>Error:</strong> {supabaseConfig.sessionError}</div>
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
            <h3 className="font-semibold mb-2 text-red-600">🚨 CRITICAL: Fix Supabase Configuration First</h3>
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="text-sm text-red-800 mb-2">
                <strong>Your Supabase project is configured for mobile/Expo, not web!</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-red-700">
                <li>Go to <a href="https://supabase.com/dashboard/project/mnohnvqatpgeidffeakx/auth/url-configuration" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Supabase Auth Settings</a></li>
                <li>Change <strong>Site URL</strong> from <code>exp://192.168.232:8081</code> to <code>{config.currentOrigin}</code></li>
                <li>Add <code>{config.expectedRedirectUrl}</code> to <strong>Redirect URLs</strong></li>
                <li>Remove any Expo/mobile URLs</li>
                <li>Save the changes</li>
              </ol>
            </div>
            
            <h3 className="font-semibold mb-2">Then Update Google OAuth:</h3>
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