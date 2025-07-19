import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { ThemeProvider } from 'next-themes'
import { UserWithRole } from '@/lib/types'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

// Mock the auth context
const mockUser: UserWithRole = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'venue_owner',
  venues: [
    {
      id: '1',
      venue_id: 'venue-1',
      role: 'owner',
      venue: {
        id: 'venue-1',
        name: 'Test Venue',
        description: 'A test venue',
        location: null,
        contact: null,
        hours: null,
        cover_image_url: null,
        cover_video_url: null,
        latitude: null,
        longitude: null,
        address: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    }
  ]
}

const mockAuthContext = {
  user: mockUser,
  signOut: jest.fn(),
  signInWithGoogle: jest.fn(),
  loading: false
}

jest.mock('@/components/auth/AuthProvider', () => ({
  useAuthContext: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  createClientComponentClient: () => ({
    auth: {
      signOut: jest.fn()
    }
  })
}))

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        {component}
      </AuthProvider>
    </ThemeProvider>
  )
}

describe('DashboardLayout', () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard')
  })

  it('renders the dashboard layout with sidebar and header', () => {
    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    // Check if main components are rendered
    expect(screen.getByText('Buzzvar Admin Portal')).toBeInTheDocument()
    expect(screen.getByText('Buzzvar')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('renders navigation items based on user role', () => {
    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    // Check if venue owner specific items are rendered
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Venue Management')).toBeInTheDocument()
    expect(screen.getByText('Promotions')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    
    // Admin-only items should not be visible
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument()
  })

  it('renders user venues in sidebar', () => {
    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    expect(screen.getByText('My Venues')).toBeInTheDocument()
    expect(screen.getByText('Test Venue')).toBeInTheDocument()
  })

  it('renders breadcrumb navigation', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard/venue/test')
    
    renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    // Breadcrumb should be rendered for non-root paths
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Venue')).toBeInTheDocument()
  })

  it('returns null when user is not authenticated', () => {
    const mockAuthContextNoUser = {
      ...mockAuthContext,
      user: null
    }

    jest.mocked(require('@/components/auth/AuthProvider').useAuthContext).mockReturnValue(mockAuthContextNoUser)

    const { container } = renderWithProviders(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    expect(container.firstChild).toBeNull()
  })
})