'use client'

import { UserWithRole } from '@/lib/types'
import { useAuthContext } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { ModeToggle } from '@/components/themes/mode-toggle'
import { LogOut, User, Settings } from 'lucide-react'

interface HeaderProps {
  userRole: UserWithRole
}

export function Header({ userRole }: HeaderProps) {
  const { signOut } = useAuthContext()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getUserInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator'
      case 'venue_owner':
        return 'Venue Owner'
      default:
        return 'User'
    }
  }

  return (
    <header className="sticky top-0 z-30 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-4 lg:px-6 h-full">
        <div className="flex items-center gap-4">
          {/* Mobile menu space - handled by Sidebar component */}
          <div className="lg:hidden w-10" />
          <h1 className="text-lg lg:text-xl font-semibold">Buzzvar Admin Portal</h1>
        </div>
        
        <div className="flex items-center gap-2 lg:gap-4">
          <ModeToggle />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={userRole.avatar_url || undefined} alt={userRole.name || userRole.email} />
                  <AvatarFallback>
                    {getUserInitials(userRole.name, userRole.email)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {userRole.name || 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userRole.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {getRoleLabel(userRole.role)}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}