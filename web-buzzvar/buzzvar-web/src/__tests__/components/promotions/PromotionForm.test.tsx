import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PromotionForm } from '@/components/promotions/PromotionForm'
import { PromotionService } from '@/services/promotionService'
import { toast } from 'sonner'

// Mock the services and dependencies
vi.mock('@/services/promotionService')
vi.mock('sonner')
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (typeof date === 'string') {
      return date
    }
    return '2024-01-01'
  })
}))

const mockPromotion = {
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
}

describe('PromotionForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(PromotionService.getVenuePromotions).mockResolvedValue([])
  })

  it('renders create form correctly', () => {
    render(
      <PromotionForm
        venueId="venue-1"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Create New Promotion')).toBeInTheDocument()
    expect(screen.getByLabelText('Title *')).toBeInTheDocument()
    expect(screen.getByLabelText('Description *')).toBeInTheDocument()
    expect(screen.getByLabelText('Promotion Type *')).toBeInTheDocument()
    expect(screen.getByText('Create Promotion')).toBeInTheDocument()
  })

  it('renders edit form with existing promotion data', () => {
    render(
      <PromotionForm
        venueId="venue-1"
        promotion={mockPromotion}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Edit Promotion')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Happy Hour Special')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Great drinks at great prices')).toBeInTheDocument()
    expect(screen.getByText('Update Promotion')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(
      <PromotionForm
        venueId="venue-1"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const submitButton = screen.getByText('Create Promotion')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument()
      expect(screen.getByText('Description is required')).toBeInTheDocument()
      expect(screen.getByText('Start date is required')).toBeInTheDocument()
      expect(screen.getByText('End date is required')).toBeInTheDocument()
      expect(screen.getByText('At least one day must be selected')).toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('validates date range', async () => {
    render(
      <PromotionForm
        venueId="venue-1"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // Fill in required fields
    fireEvent.change(screen.getByLabelText('Title *'), {
      target: { value: 'Test Promotion' }
    })
    fireEvent.change(screen.getByLabelText('Description *'), {
      target: { value: 'Test description' }
    })

    // Set end date before start date
    const startDateInput = screen.getByDisplayValue('2024-01-02')
    const endDateInput = screen.getByDisplayValue('2024-01-01')
    
    if (startDateInput && endDateInput) {
      fireEvent.change(startDateInput, { target: { value: '2024-01-02' } })
      fireEvent.change(endDateInput, { target: { value: '2024-01-01' } })
    }

    const submitButton = screen.getByText('Create Promotion')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('End date must be after start date')).toBeInTheDocument()
    })
  })

  it('validates time range', async () => {
    render(
      <PromotionForm
        venueId="venue-1"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // Fill in required fields
    fireEvent.change(screen.getByLabelText('Title *'), {
      target: { value: 'Test Promotion' }
    })
    fireEvent.change(screen.getByLabelText('Description *'), {
      target: { value: 'Test description' }
    })

    // Set end time before start time
    const startTimeInput = screen.getByLabelText('Start Time')
    const endTimeInput = screen.getByLabelText('End Time')
    
    fireEvent.change(startTimeInput, { target: { value: '20:00' } })
    fireEvent.change(endTimeInput, { target: { value: '18:00' } })

    const submitButton = screen.getByText('Create Promotion')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('End time must be after start time')).toBeInTheDocument()
    })
  })

  it('handles day of week selection', () => {
    render(
      <PromotionForm
        venueId="venue-1"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // Select Monday (index 1)
    const mondayCheckbox = screen.getByLabelText('Mon')
    fireEvent.click(mondayCheckbox)

    expect(mondayCheckbox).toBeChecked()

    // Unselect Monday
    fireEvent.click(mondayCheckbox)
    expect(mondayCheckbox).not.toBeChecked()
  })

  it('shows character count for description', () => {
    render(
      <PromotionForm
        venueId="venue-1"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const descriptionInput = screen.getByLabelText('Description *')
    fireEvent.change(descriptionInput, {
      target: { value: 'Test description' }
    })

    expect(screen.getByText('16/500')).toBeInTheDocument()
  })

  it('shows preview when preview button is clicked', () => {
    render(
      <PromotionForm
        venueId="venue-1"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const previewButton = screen.getByText('Preview')
    fireEvent.click(previewButton)

    expect(screen.getByText('Mobile App Preview')).toBeInTheDocument()
    expect(screen.getByText('Hide Preview')).toBeInTheDocument()
  })

  it('updates preview content when form values change', () => {
    render(
      <PromotionForm
        venueId="venue-1"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // Show preview
    const previewButton = screen.getByText('Preview')
    fireEvent.click(previewButton)

    // Change title
    const titleInput = screen.getByLabelText('Title *')
    fireEvent.change(titleInput, {
      target: { value: 'New Promotion Title' }
    })

    // Check if preview updates
    expect(screen.getByText('New Promotion Title')).toBeInTheDocument()
  })

  it('calls onSubmit with correct data', async () => {
    render(
      <PromotionForm
        venueId="venue-1"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // Fill in form
    fireEvent.change(screen.getByLabelText('Title *'), {
      target: { value: 'Test Promotion' }
    })
    fireEvent.change(screen.getByLabelText('Description *'), {
      target: { value: 'Test description' }
    })

    // Select Monday
    const mondayCheckbox = screen.getByLabelText('Mon')
    fireEvent.click(mondayCheckbox)

    // Submit form
    const submitButton = screen.getByText('Create Promotion')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Promotion',
          description: 'Test description',
          days_of_week: [1]
        })
      )
    })
  })

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <PromotionForm
        venueId="venue-1"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('shows loading state when submitting', () => {
    render(
      <PromotionForm
        venueId="venue-1"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isSubmitting={true}
      />
    )

    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeDisabled()
  })

  it('shows template selector for new promotions', () => {
    render(
      <PromotionForm
        venueId="venue-1"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Use Template')).toBeInTheDocument()
  })

  it('does not show template selector for existing promotions', () => {
    render(
      <PromotionForm
        venueId="venue-1"
        promotion={mockPromotion}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.queryByText('Use Template')).not.toBeInTheDocument()
  })

  it('shows auto-save toggle for existing promotions', () => {
    render(
      <PromotionForm
        venueId="venue-1"
        promotion={mockPromotion}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByLabelText('Enable auto-save')).toBeInTheDocument()
  })

  it('shows unsaved changes indicator', async () => {
    render(
      <PromotionForm
        venueId="venue-1"
        promotion={mockPromotion}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // Make a change
    const titleInput = screen.getByDisplayValue('Happy Hour Special')
    fireEvent.change(titleInput, {
      target: { value: 'Updated Title' }
    })

    await waitFor(() => {
      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument()
    })
  })

  it('checks for promotion conflicts', async () => {
    vi.mocked(PromotionService.getVenuePromotions).mockResolvedValue([
      {
        ...mockPromotion,
        id: '2',
        title: 'Conflicting Promotion'
      }
    ])

    render(
      <PromotionForm
        venueId="venue-1"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // Fill in dates and days that would conflict
    fireEvent.change(screen.getByLabelText('Title *'), {
      target: { value: 'Test Promotion' }
    })

    // Select Monday
    const mondayCheckbox = screen.getByLabelText('Mon')
    fireEvent.click(mondayCheckbox)

    await waitFor(() => {
      expect(screen.getByText(/This promotion may conflict with/)).toBeInTheDocument()
    })
  })
})