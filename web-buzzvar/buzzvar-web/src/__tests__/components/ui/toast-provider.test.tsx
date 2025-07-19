import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { toast, ToastProvider, useToast } from '@/components/ui/toast-provider'

// Mock sonner
vi.mock('sonner', () => {
  const mockSonnerToast = vi.fn()
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    promise: vi.fn(),
    dismiss: vi.fn(),
  }

  // Assign the base function
  Object.assign(mockSonnerToast, mockToast)

  return {
    toast: mockSonnerToast,
    Toaster: ({ children }: { children: React.ReactNode }) => <div data-testid="toaster">{children}</div>,
  }
})

// Get the mocked functions for testing
const mockToast = vi.mocked(await import('sonner')).toast as any
const mockSonnerToast = mockToast as any

describe('toast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls sonner success toast with correct parameters', () => {
    toast.success('Success message', { description: 'Success description' })
    
    expect(mockToast.success).toHaveBeenCalledWith('Success message', {
      description: 'Success description',
      duration: 4000,
      icon: expect.any(Object),
    })
  })

  it('calls sonner error toast with correct parameters', () => {
    toast.error('Error message', { description: 'Error description' })
    
    expect(mockToast.error).toHaveBeenCalledWith('Error message', {
      description: 'Error description',
      duration: 6000,
      icon: expect.any(Object),
    })
  })

  it('calls sonner warning toast with correct parameters', () => {
    toast.warning('Warning message')
    
    expect(mockToast.warning).toHaveBeenCalledWith('Warning message', {
      description: undefined,
      duration: 5000,
      icon: expect.any(Object),
    })
  })

  it('calls sonner info toast with correct parameters', () => {
    toast.info('Info message')
    
    expect(mockToast.info).toHaveBeenCalledWith('Info message', {
      description: undefined,
      duration: 4000,
      icon: expect.any(Object),
    })
  })

  it('calls sonner loading toast', () => {
    toast.loading('Loading message')
    
    expect(mockToast.loading).toHaveBeenCalledWith('Loading message', {
      description: undefined,
      icon: expect.any(Object),
    })
  })

  it('calls sonner promise toast', () => {
    const promise = Promise.resolve('success')
    
    toast.promise(promise, {
      loading: 'Loading...',
      success: 'Success!',
      error: 'Error!',
    })
    
    expect(mockToast.promise).toHaveBeenCalledWith(promise, {
      loading: {
        title: 'Loading...',
        icon: expect.any(Object),
      },
      success: expect.any(Function),
      error: expect.any(Function),
    })
  })

  it('calls sonner dismiss', () => {
    toast.dismiss('toast-id')
    
    expect(mockToast.dismiss).toHaveBeenCalledWith('toast-id')
  })

  it('calls custom toast with action', () => {
    const onClick = vi.fn()
    
    toast.custom('Custom message', {
      action: {
        label: 'Action',
        onClick,
      },
      variant: 'success',
    })
    
    expect(mockSonnerToast).toHaveBeenCalledWith('Custom message', {
      description: undefined,
      duration: 4000,
      icon: expect.any(Object),
      action: {
        label: 'Action',
        onClick,
      },
    })
  })
})

describe('ToastProvider', () => {
  it('renders children and Toaster', () => {
    render(
      <ToastProvider>
        <div data-testid="child">Child content</div>
      </ToastProvider>
    )
    
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByTestId('toaster')).toBeInTheDocument()
  })

  it('passes props to Toaster', () => {
    render(
      <ToastProvider position="top-left" theme="dark">
        <div>Content</div>
      </ToastProvider>
    )
    
    expect(screen.getByTestId('toaster')).toBeInTheDocument()
  })
})

describe('useToast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('provides toast functions', () => {
    const { result } = renderHook(() => useToast())
    
    expect(typeof result.current.showSuccess).toBe('function')
    expect(typeof result.current.showError).toBe('function')
    expect(typeof result.current.showWarning).toBe('function')
    expect(typeof result.current.showInfo).toBe('function')
    expect(typeof result.current.showLoading).toBe('function')
    expect(typeof result.current.showPromise).toBe('function')
  })

  it('calls toast.success when showSuccess is called', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.showSuccess('Success message', 'Success description')
    })
    
    expect(mockToast.success).toHaveBeenCalledWith('Success message', {
      description: 'Success description',
      duration: 4000,
      icon: expect.any(Object),
    })
  })

  it('calls toast.error when showError is called', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.showError('Error message')
    })
    
    expect(mockToast.error).toHaveBeenCalledWith('Error message', {
      description: undefined,
      duration: 6000,
      icon: expect.any(Object),
    })
  })

  it('provides convenience methods for common patterns', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.showSaveSuccess('User Profile')
    })
    
    expect(mockToast.success).toHaveBeenCalledWith('Saved successfully', {
      description: 'User Profile has been saved',
      duration: 4000,
      icon: expect.any(Object),
    })
  })

  it('shows delete success message', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.showDeleteSuccess('Item')
    })
    
    expect(mockToast.success).toHaveBeenCalledWith('Deleted successfully', {
      description: 'Item has been deleted',
      duration: 4000,
      icon: expect.any(Object),
    })
  })

  it('shows update success message', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.showUpdateSuccess('Settings')
    })
    
    expect(mockToast.success).toHaveBeenCalledWith('Updated successfully', {
      description: 'Settings has been updated',
      duration: 4000,
      icon: expect.any(Object),
    })
  })

  it('shows create success message', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.showCreateSuccess('New User')
    })
    
    expect(mockToast.success).toHaveBeenCalledWith('Created successfully', {
      description: 'New User has been created',
      duration: 4000,
      icon: expect.any(Object),
    })
  })

  it('shows network error message', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.showNetworkError()
    })
    
    expect(mockToast.error).toHaveBeenCalledWith('Network error', {
      description: 'Please check your connection and try again',
      duration: 6000,
      icon: expect.any(Object),
    })
  })

  it('shows validation error message', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.showValidationError('Email is required')
    })
    
    expect(mockToast.error).toHaveBeenCalledWith('Validation error', {
      description: 'Email is required',
      duration: 6000,
      icon: expect.any(Object),
    })
  })

  it('shows permission error message', () => {
    const { result } = renderHook(() => useToast())
    
    act(() => {
      result.current.showPermissionError()
    })
    
    expect(mockToast.error).toHaveBeenCalledWith('Permission denied', {
      description: "You don't have permission to perform this action",
      duration: 6000,
      icon: expect.any(Object),
    })
  })

  it('shows unsaved changes toast with action', () => {
    const { result } = renderHook(() => useToast())
    const onSave = vi.fn()
    const onDiscard = vi.fn()
    
    act(() => {
      result.current.showUnsavedChanges(onSave, onDiscard)
    })
    
    expect(mockSonnerToast).toHaveBeenCalledWith('You have unsaved changes', {
      description: 'Would you like to save them?',
      duration: 10000,
      action: {
        label: 'Save',
        onClick: onSave,
      },
      icon: expect.any(Object), // The custom toast uses icon instead of variant
    })
  })

  it('handles promise toast', () => {
    const { result } = renderHook(() => useToast())
    const promise = Promise.resolve('data')
    
    act(() => {
      result.current.showPromise(promise, {
        loading: 'Loading...',
        success: 'Success!',
        error: 'Error!',
      })
    })
    
    expect(mockToast.promise).toHaveBeenCalledWith(promise, {
      loading: {
        title: 'Loading...',
        icon: expect.any(Object),
      },
      success: expect.any(Function),
      error: expect.any(Function),
    })
  })
})