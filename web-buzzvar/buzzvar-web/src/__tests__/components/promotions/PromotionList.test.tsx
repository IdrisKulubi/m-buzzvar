import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PromotionList } from '@/components/promotions/PromotionList'
import { PromotionService } from '@/services/promotionService'
import { toast } from 'sonner'

// Mock the services and dependencies
vi.mock('@/services/promotionService')
vi.mock('sonner')
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => '2024-01-01')
}))

const mockPromotions = [
  {
    id: '1',
    venue_id: 'venue-1',
    title: 'Happy Hour Special',
    description: 'Great drinks at great prices',
    start_date: '2024-01-01',
    end_date: '2024-01-31',
    days_of_week: [1, 2, 3, 4, 5],
    start_time: '17:00',
    end_time: '19:00',
    promotion_type: 'happy_hour' as const,
    image_url: null,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    status: 'active' as const
  },
  {
    id: '2',
    venue_id: 'venue-1',
    title: 'Weekend Event',
    description: 'Live music and entertainment',
    start_date: '2024-02-01',
    end_date: '2024-02-28',
    days_of_week: [5, 6],
    start_time: '20:00',
    end_time: '02:00',
    promotion_type: 'event' as const,
    image_url: null,
    is_active: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    status: 'scheduled' as const
  }
]

describe('PromotionList', () => {
  const mockOnEdit = vi.fn()
  const mockOnCreateNew = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(PromotionService.getVenuePromotions).mockResolvedValue(mockPromotions)
  })

  it('renders promotion list with promotions', async () => {
    render(
      <PromotionList
        venueId="venue-1"
        onEdit={mockOnEdit}
        onCreateNew={mockOnCreateNew}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Happy Hour Special')).toBeInTheDocument()
      expect(screen.getByText('Weekend Event')).toBeInTheDocument()
    })

    expect(screen.getByText('Promotions')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // Badge with count
  })

  it('shows loading state initially', () => {
    vi.mocked(PromotionService.getVenuePromotions).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(
      <PromotionList
        venueId="venue-1"
        onEdit={mockOnEdit}
        onCreateNew={mockOnCreateNew}
      />
    )

    expect(screen.getAllByText(/animate-pulse/)).toBeTruthy()
  })

  it('shows empty state when no promotions', async () => {
    vi.mocked(PromotionService.getVenuePromotions).mockResolvedValue([])

    render(
      <PromotionList
        venueId="venue-1"
        onEdit={mockOnEdit}
        onCreateNew={mockOnCreateNew}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('No promotions found')).toBeInTheDocument()
      expect(screen.getByText('Create your first promotion to get started')).toBeInTheDocument()
    })
  })

  it('filters promotions by search term', async () => {
    render(
      <PromotionList
        venueId="venue-1"
        onEdit={mockOnEdit}
        onCreateNew={mockOnCreateNew}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Happy Hour Special')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search promotions...')
    fireEvent.change(searchInput, { target: { value: 'Happy' } })

    await waitFor(() => {
      expect(screen.getByText('Happy Hour Special')).toBeInTheDocument()
      expect(screen.queryByText('Weekend Event')).not.toBeInTheDocument()
    })
  })

  it('shows and hides filters panel', async () => {
    render(
      <PromotionList
        venueId="venue-1"
        onEdit={mockOnEdit}
        onCreateNew={mockOnCreateNew}
      />
    )

    const filtersButton = screen.getByText('Filters')
    fireEvent.click(filtersButton)

    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()

    fireEvent.click(filtersButton)
    
    await waitFor(() => {
      expect(screen.queryByText('Type')).not.toBeInTheDocument()
    })
  })

  it('handles promotion selection and bulk actions', async () => {
    vi.mocked(PromotionService.bulkUpdatePromotions).mockResolvedValue([])

    render(
      <PromotionList
        venueId="venue-1"
        onEdit={mockOnEdit}
        onCreateNew={mockOnCreateNew}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Happy Hour Special')).toBeInTheDocument()
    })

    // Select a promotion
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1]) // First checkbox is "Select all"

    await waitFor(() => {
      expect(screen.getByText('1 promotion(s) selected')).toBeInTheDocument()
    })

    // Test bulk activate
    const activateButton = screen.getByText('Activate')
    fireEvent.click(activateButton)

    await waitFor(() => {
      expect(PromotionService.bulkUpdatePromotions).toHaveBeenCalledWith(['1'], {
        is_active: true
      })
    })
  })

  it('handles promotion deletion', async () => {
    vi.mocked(PromotionService.deletePromotion).mockResolvedValue()

    render(
      <PromotionList
        venueId="venue-1"
        onEdit={mockOnEdit}
        onCreateNew={mockOnCreateNew}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Happy Hour Special')).toBeInTheDocument()
    })

    // Click on dropdown menu
    const dropdownButtons = screen.getAllByRole('button')
    const menuButton = dropdownButtons.find(button => 
      button.querySelector('svg')?.classList.contains('lucide-more-vertical')
    )
    
    if (menuButton) {
      fireEvent.click(menuButton)
      
      const deleteButton = screen.getByText('Delete')
      fireEvent.click(deleteButton)

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: 'Delete' })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(PromotionService.deletePromotion).toHaveBeenCalledWith('1')
      })
    }
  })

  it('handles promotion duplication', async () => {
    vi.mocked(PromotionService.duplicatePromotion).mockResolvedValue(mockPromotions[0])

    render(
      <PromotionList
        venueId="venue-1"
        onEdit={mockOnEdit}
        onCreateNew={mockOnCreateNew}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Happy Hour Special')).toBeInTheDocument()
    })

    // Click on dropdown menu
    const dropdownButtons = screen.getAllByRole('button')
    const menuButton = dropdownButtons.find(button => 
      button.querySelector('svg')?.classList.contains('lucide-more-vertical')
    )
    
    if (menuButton) {
      fireEvent.click(menuButton)
      
      const duplicateButton = screen.getByText('Duplicate')
      fireEvent.click(duplicateButton)

      await waitFor(() => {
        expect(PromotionService.duplicatePromotion).toHaveBeenCalledWith('1')
      })
    }
  })

  it('handles status toggle', async () => {
    vi.mocked(PromotionService.togglePromotionStatus).mockResolvedValue(mockPromotions[0])

    render(
      <PromotionList
        venueId="venue-1"
        onEdit={mockOnEdit}
        onCreateNew={mockOnCreateNew}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Happy Hour Special')).toBeInTheDocument()
    })

    // Click on dropdown menu
    const dropdownButtons = screen.getAllByRole('button')
    const menuButton = dropdownButtons.find(button => 
      button.querySelector('svg')?.classList.contains('lucide-more-vertical')
    )
    
    if (menuButton) {
      fireEvent.click(menuButton)
      
      const deactivateButton = screen.getByText('Deactivate')
      fireEvent.click(deactivateButton)

      await waitFor(() => {
        expect(PromotionService.togglePromotionStatus).toHaveBeenCalledWith('1', false)
      })
    }
  })

  it('calls onEdit when edit is clicked', async () => {
    render(
      <PromotionList
        venueId="venue-1"
        onEdit={mockOnEdit}
        onCreateNew={mockOnCreateNew}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Happy Hour Special')).toBeInTheDocument()
    })

    // Click on dropdown menu
    const dropdownButtons = screen.getAllByRole('button')
    const menuButton = dropdownButtons.find(button => 
      button.querySelector('svg')?.classList.contains('lucide-more-vertical')
    )
    
    if (menuButton) {
      fireEvent.click(menuButton)
      
      const editButton = screen.getByText('Edit')
      fireEvent.click(editButton)

      expect(mockOnEdit).toHaveBeenCalledWith(mockPromotions[0])
    }
  })

  it('calls onCreateNew when new promotion button is clicked', async () => {
    render(
      <PromotionList
        venueId="venue-1"
        onEdit={mockOnEdit}
        onCreateNew={mockOnCreateNew}
      />
    )

    const newPromotionButton = screen.getByText('New Promotion')
    fireEvent.click(newPromotionButton)

    expect(mockOnCreateNew).toHaveBeenCalled()
  })

  it('displays correct status badges', async () => {
    render(
      <PromotionList
        venueId="venue-1"
        onEdit={mockOnEdit}
        onCreateNew={mockOnCreateNew}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Scheduled')).toBeInTheDocument()
    })
  })

  it('displays correct promotion type badges', async () => {
    render(
      <PromotionList
        venueId="venue-1"
        onEdit={mockOnEdit}
        onCreateNew={mockOnCreateNew}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('HAPPY HOUR')).toBeInTheDocument()
      expect(screen.getByText('EVENT')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    vi.mocked(PromotionService.getVenuePromotions).mockRejectedValue(
      new Error('API Error')
    )

    render(
      <PromotionList
        venueId="venue-1"
        onEdit={mockOnEdit}
        onCreateNew={mockOnCreateNew}
      />
    )

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load promotions')
    })
  })
})