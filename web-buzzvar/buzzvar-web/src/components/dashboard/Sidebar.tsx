'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserWithRole } from '@/lib/types'
import { cn } from '@/lib/utils'
import { 
  BarChart3, 
  Building2, 
  Calendar, 
  Home, 
  Settings, 
  Users, 
  Shield,
  Megaphone
} from 'lucide-react'

interface SidebarProps {
  userRole: UserWithRole
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    roles: ['admin', 'venue_owner', 'user']
  },
  {
    title: 'Venue Management',
    href: '/dashboard/venue',
    icon: Building2,
    roles: ['admin', 'venue_owner']
  },
  {
    title: 'Promotions',
    href: '/dashboard/promotions',
    icon: Megaphone,
    roles: ['admin', 'venue_owner']
  },
  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
    roles: ['admin', 'venue_owner']
  },
  {
    title: 'Admin Panel',
    href: '/dashboard/admin',
    icon: Shield,
    roles: ['admin']
  },
  {
    title: 'User Management',
    href: '/dashboard/admin/users',
    icon: Users,
    roles: ['admin']
  },
  {
    title: 'Venue Management',
    href: '/dashboard/admin/venues',
    icon: Building2,
    roles: ['admin']
  }
]

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(userRole.role)
  )

  return (
    <div className="w-64 bg-card border-r">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">B</span>
          </div>
          <span className="font-semibold">Buzzvar</span>
        </div>
        
        <nav className="space-y-2">
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            )
          })}
        </nav>
        
        {userRole.role === 'venue_owner' && userRole.venues && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              My Venues
            </h3>
            <div className="space-y-1">
              {userRole.venues.map((venue) => (
                <Link
                  key={venue.venue_id}
                  href={`/dashboard/venue/${venue.venue_id}`}
                  className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  {venue.venue.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}