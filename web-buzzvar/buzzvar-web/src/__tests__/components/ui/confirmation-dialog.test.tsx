import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  ConfirmationDialog,
  useConfirmationDialog,
  useDeleteConfirmation,
  useSaveConfirmation,
  useDiscardConfirmation,
} from '@/components/ui/confirmation-dialog'

describe('ConfirmationDialog', () => {
  it('renders dialog when open', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    
    render(
      <ConfirmationDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Confirm Action"
        description="Are you sure you want to proceed?"
        onConfirm={onConfirm}
      />
    )
    
    expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    
    render(
      <ConfirmationDialog
        open={false}
        onOpenChange={onOpenChange}
        title="Confirm Action"
        description="Are you sure you want to proceed?"
        onConfirm={onConfirm}
      />
    )
    
    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument()
  })

  it('shows custom button text', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    
    render(
      <ConfirmationDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Delete Item"
        description="This action cannot be undone"
        confirmText="Delete"
        cancelText="Keep"
        onConfirm={onConfirm}
      />
    )
    
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.getByText('Keep')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    
    render(
      <ConfirmationDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Confirm Action"
        description="Are you sure?"
        onConfirm={onConfirm}
      />
    )
    
    const confirmButton = screen.getByText('Confirm')
    fireEvent.click(confirmButton)
    
    expect(onConfirm).toHaveBeenCalled()
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const onOpenChange = vi.fn()
    
    render(
      <ConfirmationDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Confirm Action"
        description="Are you sure?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    expect(onCancel).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows loading state', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    
    render(
      <ConfirmationDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Confirm Action"
        description="Are you sure?"
        onConfirm={onConfirm}
        loading={true}
      />
    )
    
    expect(screen.getByText('Processing...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled()
  })

  it('shows different variants with appropriate icons', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    
    const { rerender } = render(
      <ConfirmationDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Delete Item"
        description="This is destructive"
        onConfirm={onConfirm}
        variant="destructive"
      />
    )
    
    expect(screen.getByText('Delete Item')).toBeInTheDocument()
    
    rerender(
      <ConfirmationDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Warning"
        description="This is a warning"
        onConfirm={onConfirm}
        variant="warning"
      />
    )
    
    expect(screen.getByText('Warning')).toBeInTheDocument()
  })

  it('handles async onConfirm', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()
    
    render(
      <ConfirmationDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Confirm Action"
        description="Are you sure?"
        onConfirm={onConfirm}
      />
    )
    
    const confirmButton = screen.getByText('Confirm')
    fireEvent.click(confirmButton)
    
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled()
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('disables buttons when disabled prop is true', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    
    render(
      <ConfirmationDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Confirm Action"
        description="Are you sure?"
        onConfirm={onConfirm}
        disabled={true}
      />
    )
    
    expect(screen.getByText('Confirm')).toBeDisabled()
  })
})

describe('useConfirmationDialog', () => {
  it('provides showConfirmation and ConfirmationDialog', () => {
    const { result } = renderHook(() => useConfirmationDialog())
    
    expect(typeof result.current.showConfirmation).toBe('function')
    expect(typeof result.current.hideConfirmation).toBe('function')
    expect(typeof result.current.ConfirmationDialog).toBe('function')
  })

  it('shows confirmation dialog when showConfirmation is called', () => {
    const { result } = renderHook(() => useConfirmationDialog())
    const onConfirm = vi.fn()
    
    act(() => {
      result.current.showConfirmation({
        title: 'Test Confirmation',
        description: 'Test description',
        onConfirm,
      })
    })
    
    const DialogComponent = result.current.ConfirmationDialog
    render(<DialogComponent />)
    
    expect(screen.getByText('Test Confirmation')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
  })
})

describe('useDeleteConfirmation', () => {
  it('shows delete confirmation with proper styling', () => {
    const { result } = renderHook(() => useDeleteConfirmation())
    const onConfirm = vi.fn()
    
    act(() => {
      result.current.showDeleteConfirmation('Test Item', onConfirm)
    })
    
    const DialogComponent = result.current.ConfirmationDialog
    render(<DialogComponent />)
    
    expect(screen.getByText('Delete Confirmation')).toBeInTheDocument()
    expect(screen.getByText(/delete "Test Item"/i)).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })
})

describe('useSaveConfirmation', () => {
  it('shows save confirmation', () => {
    const { result } = renderHook(() => useSaveConfirmation())
    const onConfirm = vi.fn()
    
    act(() => {
      result.current.showSaveConfirmation('Save your changes?', onConfirm)
    })
    
    const DialogComponent = result.current.ConfirmationDialog
    render(<DialogComponent />)
    
    expect(screen.getByText('Save Changes')).toBeInTheDocument()
    expect(screen.getByText('Save your changes?')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })
})

describe('useDiscardConfirmation', () => {
  it('shows discard confirmation', () => {
    const { result } = renderHook(() => useDiscardConfirmation())
    const onConfirm = vi.fn()
    
    act(() => {
      result.current.showDiscardConfirmation(onConfirm)
    })
    
    const DialogComponent = result.current.ConfirmationDialog
    render(<DialogComponent />)
    
    expect(screen.getByText('Discard Changes')).toBeInTheDocument()
    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
    expect(screen.getByText('Discard')).toBeInTheDocument()
    expect(screen.getByText('Keep Editing')).toBeInTheDocument()
  })
})