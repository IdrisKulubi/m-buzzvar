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
  Megaphone,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SidebarProps {
  user: {
    id: string
    email: string
    name?: string | null
    image?: string | null
    role: string
  }
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
    roles: ['admin', 'super_admin', 'venue_owner', 'user']
  },
  {
    title: 'Venue Management',
    href: '/venue',
    icon: Building2,
    roles: ['admin', 'super_admin', 'venue_owner']
  },
  {
    title: 'Promotions',
    href: '/promotions',
    icon: Megaphone,
    roles: ['admin', 'super_admin', 'venue_owner']
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    roles: ['admin', 'super_admin', 'venue_owner']
  },
  {
    title: 'Admin Panel',
    href: '/admin',
    icon: Shield,
    roles: ['admin', 'super_admin']
  },
  {
    title: 'User Management',
    href: '/admin/users',
    icon: Users,
    roles: ['admin', 'super_admin']
  },
  {
    title: 'Venue Management',
    href: '/admin/venues',
    icon: Building2,
    roles: ['admin', 'super_admin']
  }
]

function SidebarContent({ user, onLinkClick }: { user: SidebarProps['user']; onLinkClick?: () => void }) {
  const pathname = usePathname()

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user.role)
  )

  return (
    <div className="flex flex-col h-full">
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
                onClick={onLinkClick}
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
      </div>
      
      {/* TODO: Add venue list for venue owners */}
      {user.role === 'venue_owner' && (
        <div className="px-6 pb-6 mt-auto">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            My Venues
          </h3>
          <div className="text-xs text-muted-foreground">
            Venue list will be loaded dynamically
          </div>
        </div>
      )}
    </div>
  )
}

export function Sidebar({ user }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:bg-card lg:border-r">
        <SidebarContent user={user} />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-4 left-4 z-40"
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open sidebar</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent 
            user={user} 
            onLinkClick={() => setMobileOpen(false)} 
          />
        </SheetContent>
      </Sheet>
    </>
  )
}