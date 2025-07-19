'use client'

import { useAuthContext } from '@/components/auth/AuthProvider'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext()

  if (!user) {
    return null // This should be handled by ProtectedRoute
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={user} />
      <main className="flex-1 overflow-y-auto">
        <Header userRole={user} />
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}