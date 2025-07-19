'use client'

import { useAuthContext } from '@/components/auth/AuthProvider'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Breadcrumb } from './Breadcrumb'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext()

  if (!user) {
    return null // This should be handled by ProtectedRoute
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={user} />
      
      {/* Main content area with responsive margin */}
      <div className="lg:pl-64">
        <main className="flex-1">
          <Header userRole={user} />
          <div className="p-4 lg:p-6">
            <Breadcrumb />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}