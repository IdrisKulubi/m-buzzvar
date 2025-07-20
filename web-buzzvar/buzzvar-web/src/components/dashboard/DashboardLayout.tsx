'use client'

import { useAuthContext } from '@/components/auth/AuthProvider'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Breadcrumb } from './Breadcrumb'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = useAuthContext()

  if (!user) {
    return null // This should be handled by ProtectedRoute
  }

  const userWithRole = {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: role || 'user'
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={userWithRole} />
      
      {/* Main content area with responsive margin */}
      <div className="lg:pl-64">
        <main className="flex-1">
          <Header user={userWithRole} />
          <div className="p-4 lg:p-6">
            <Breadcrumb />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}