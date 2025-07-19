'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SupabaseFixPage() {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  const callbackUrl = `${currentOrigin}/api/auth/callback`
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Fix Supabase Configuration
          </CardTitle>
          <CardDescription>
            Your Supabase project is configured for mobile/Expo instead of web
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Critical Issue:</strong> Supabase is trying to redirect to <code>exp://192.168.232:8081</code> 
              instead of your web application. This must be fixed before OAuth will work.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 1: Fix Supabase Auth Settings</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="font-medium mb-2">Go to Supabase Auth URL Configuration:</p>
              <Button asChild variant="outline" className="mb-3">
                <a 
                  href="https://supabase.com/dashboard/project/mnohnvqatpgeidffeakx/auth/url-configuration" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  Open Supabase Auth Settings <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-sm">Site URL:</p>
                  <div className="bg-white border rounded p-2 font-mono text-sm">
                    {currentOrigin}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Change this from <code>exp://192.168.232:8081</code>
                  </p>
                </div>
                
                <div>
                  <p className="font-medium text-sm">Redirect URLs (add these):</p>
                  <div className="space-y-1">
                    <div className="bg-white border rounded p-2 font-mono text-sm">
                      {currentOrigin}/**
                    </div>
                    <div className="bg-white border rounded p-2 font-mono text-sm">
                      {callbackUrl}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold">Step 2: Update Google OAuth Client</h3>
            
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <p className="font-medium mb-2">Go to Google Cloud Console:</p>
              <Button asChild variant="outline" className="mb-3">
                <a 
                  href="https://console.cloud.google.com/apis/credentials" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  Open Google Cloud Console <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-sm">Find OAuth Client ID:</p>
                  <div className="bg-white border rounded p-2 font-mono text-sm">
                    794588425398-3eu6nuaakjmvg4bmpo9q99d4qjsqd665.apps.googleusercontent.com
                  </div>
                </div>
                
                <div>
                  <p className="font-medium text-sm">Authorized JavaScript origins:</p>
                  <div className="bg-white border rounded p-2 font-mono text-sm">
                    {currentOrigin}
                  </div>
                </div>
                
                <div>
                  <p className="font-medium text-sm">Authorized redirect URIs:</p>
                  <div className="bg-white border rounded p-2 font-mono text-sm">
                    https://mnohnvqatpgeidffeakx.supabase.co/auth/v1/callback
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This is the Supabase callback URL, not your app's callback
                  </p>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold">Step 3: Test the Fix</h3>
            
            <div className="bg-gray-50 border rounded p-4">
              <p className="text-sm mb-2">After making the changes above:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Wait 5-10 minutes for changes to propagate</li>
                <li>Clear your browser cache and cookies</li>
                <li>Go back to <a href="/login" className="text-blue-600 hover:underline">/login</a> and try signing in</li>
                <li>Or test from <a href="/debug/auth" className="text-blue-600 hover:underline">/debug/auth</a></li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}