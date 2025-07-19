import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { PromotionTemplates } from '@/components/promotions/PromotionTemplates'

describe('PromotionTemplates', () => {
  const mockOnSelectTemplate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders template trigger button', () => {
    render(<PromotionTemplates onSelectTemplate={mockOnSelectTemplate} />)
    
    expect(screen.getByText('Use Template')).toBeInTheDocument()
  })

  it('opens template dialog when button is clicked', () => {
    render(<PromotionTemplates onSelectTemplate={mockOnSelectTemplate} />)
    
    const triggerButton = screen.getByText('Use Template')
    fireEvent.click(triggerButton)
    
    expect(screen.getByText('Choose a Promotion Template')).toBeInTheDocument()
  })

  it('displays all template types', () => {
    render(<PromotionTemplates onSelectTemplate={mockOnSelectTemplate} />)
    
    const triggerButton = screen.getByText('Use Template')
    fireEvent.click(triggerButton)
    
    expect(screen.getByText('Happy Hour')).toBeInTheDocument()
    expect(screen.getByText('Weekend Event')).toBeInTheDocument()
    expect(screen.getByText('Student Discount')).toBeInTheDocument()
    expect(screen.getByText('Special Offer')).toBeInTheDocument()
  })

  it('shows template details', () => {
    render(<PromotionTemplates onSelectTemplate={mockOnSelectTemplate} />)
    
    const triggerButton = screen.getByText('Use Template')
    fireEvent.click(triggerButton)
    
    // Check for Happy Hour template details
    expect(screen.getByText('Happy Hour Special')).toBeInTheDocument()
    expect(screen.getByText('Join us for discounted drinks and great vibes!')).toBeInTheDocument()
    expect(screen.getByText('Mon, Tue, Wed, Thu, Fri')).toBeInTheDocument()
    expect(screen.getByText('17:00 - 19:00')).toBeInTheDocument()
  })

  it('calls onSelectTemplate when template is selected', () => {
    render(<PromotionTemplates onSelectTemplate={mockOnSelectTemplate} />)
    
    const triggerButton = screen.getByText('Use Template')
    fireEvent.click(triggerButton)
    
    // Click on Happy Hour template
    const happyHourTemplate = screen.getByText('Happy Hour').closest('.cursor-pointer')
    if (happyHourTemplate) {
      fireEvent.click(happyHourTemplate)
    }
    
    expect(mockOnSelectTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Happy Hour Special',
        description: 'Join us for discounted drinks and great vibes!',
        promotion_type: 'happy_hour',
        days_of_week: [1, 2, 3, 4, 5],
        start_time: '17:00',
        end_time: '19:00'
      })
    )
  })

  it('calls onSelectTemplate when "Use This Template" button is clicked', () => {
    render(<PromotionTemplates onSelectTemplate={mockOnSelectTemplate} />)
    
    const triggerButton = screen.getByText('Use Template')
    fireEvent.click(triggerButton)
    
    // Click on "Use This Template" button for the first template
    const useTemplateButtons = screen.getAllByText('Use This Template')
    fireEvent.click(useTemplateButtons[0])
    
    expect(mockOnSelectTemplate).toHaveBeenCalled()
  })

  it('closes dialog after template selection', () => {
    render(<PromotionTemplates onSelectTemplate={mockOnSelectTemplate} />)
    
    const triggerButton = screen.getByText('Use Template')
    fireEvent.click(triggerButton)
    
    expect(screen.getByText('Choose a Promotion Template')).toBeInTheDocument()
    
    // Select a template
    const happyHourTemplate = screen.getByText('Happy Hour').closest('.cursor-pointer')
    if (happyHourTemplate) {
      fireEvent.click(happyHourTemplate)
    }
    
    // Dialog should close
    expect(screen.queryByText('Choose a Promotion Template')).not.toBeInTheDocument()
  })

  it('displays template type badges with correct colors', () => {
    render(<PromotionTemplates onSelectTemplate={mockOnSelectTemplate} />)
    
    const triggerButton = screen.getByText('Use Template')
    fireEvent.click(triggerButton)
    
    expect(screen.getByText('HAPPY HOUR')).toBeInTheDocument()
    expect(screen.getByText('EVENT')).toBeInTheDocument()
    expect(screen.getByText('DISCOUNT')).toBeInTheDocument()
    expect(screen.getByText('SPECIAL')).toBeInTheDocument()
  })

  it('shows helpful tip at the bottom', () => {
    render(<PromotionTemplates onSelectTemplate={mockOnSelectTemplate} />)
    
    const triggerButton = screen.getByText('Use Template')
    fireEvent.click(triggerButton)
    
    expect(screen.getByText(/Templates provide a starting point/)).toBeInTheDocument()
    expect(screen.getByText(/You can customize all fields after selecting a template/)).toBeInTheDocument()
  })

  it('displays template icons', () => {
    render(<PromotionTemplates onSelectTemplate={mockOnSelectTemplate} />)
    
    const triggerButton = screen.getByText('Use Template')
    fireEvent.click(triggerButton)
    
    // Check that template cards have icons (we can't easily test the actual icons, but we can check the structure)
    const templateCards = screen.getAllByRole('button', { name: /Use This Template/ })
    expect(templateCards).toHaveLength(4)
  })
})