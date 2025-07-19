import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FormWrapper, useFormValidation } from '@/components/ui/form-wrapper'
import { renderHook, act } from '@testing-library/react'

describe('FormWrapper', () => {
  it('renders form with title and description', () => {
    const onSubmit = vi.fn()
    render(
      <FormWrapper
        title="Test Form"
        description="This is a test form"
        onSubmit={onSubmit}
      >
        <input type="text" placeholder="Test input" />
      </FormWrapper>
    )
    
    expect(screen.getByText('Test Form')).toBeInTheDocument()
    expect(screen.getByText('This is a test form')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument()
  })

  it('shows submit button with custom text', () => {
    const onSubmit = vi.fn()
    render(
      <FormWrapper
        onSubmit={onSubmit}
        submitText="Save Changes"
      >
        <input type="text" />
      </FormWrapper>
    )
    
    expect(screen.getByText('Save Changes')).toBeInTheDocument()
  })

  it('shows cancel button when onCancel is provided', () => {
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    render(
      <FormWrapper
        onSubmit={onSubmit}
        onCancel={onCancel}
        cancelText="Discard"
      >
        <input type="text" />
      </FormWrapper>
    )
    
    expect(screen.getByText('Discard')).toBeInTheDocument()
  })

  it('calls onSubmit when form is submitted', async () => {
    const onSubmit = vi.fn()
    render(
      <FormWrapper onSubmit={onSubmit}>
        <input type="text" />
      </FormWrapper>
    )
    
    const form = screen.getByRole('button', { name: /submit/i }).closest('form')
    fireEvent.submit(form!)
    
    expect(onSubmit).toHaveBeenCalled()
  })

  it('shows loading state when isSubmitting is true', () => {
    const onSubmit = vi.fn()
    render(
      <FormWrapper onSubmit={onSubmit} isSubmitting={true}>
        <input type="text" />
      </FormWrapper>
    )
    
    expect(screen.getByText('Submitting...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled()
  })

  it('shows error message', () => {
    const onSubmit = vi.fn()
    render(
      <FormWrapper onSubmit={onSubmit} error="Something went wrong">
        <input type="text" />
      </FormWrapper>
    )
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('shows success message', () => {
    const onSubmit = vi.fn()
    render(
      <FormWrapper onSubmit={onSubmit} success="Form submitted successfully">
        <input type="text" />
      </FormWrapper>
    )
    
    expect(screen.getByText('Form submitted successfully')).toBeInTheDocument()
  })

  it('renders without card when showCard is false', () => {
    const onSubmit = vi.fn()
    render(
      <FormWrapper
        title="Test Form"
        onSubmit={onSubmit}
        showCard={false}
      >
        <input type="text" />
      </FormWrapper>
    )
    
    expect(screen.getByText('Test Form')).toBeInTheDocument()
    // Should not have card styling
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('disables form when disabled prop is true', () => {
    const onSubmit = vi.fn()
    render(
      <FormWrapper onSubmit={onSubmit} disabled={true}>
        <input type="text" />
      </FormWrapper>
    )
    
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
  })
})

describe('useFormValidation', () => {
  const initialValues = {
    name: '',
    email: '',
    age: null as number | null,
  }

  const validationRules = {
    name: { required: true, minLength: 2 },
    email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    age: { required: true, custom: (value: number | null) => value !== null && value < 18 ? 'Must be 18 or older' : null },
  }

  it('initializes with default values', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    )
    
    expect(result.current.fields.name.value).toBe('')
    expect(result.current.fields.email.value).toBe('')
    expect(result.current.fields.age.value).toBe(null)
  })

  it('updates field values', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    )
    
    act(() => {
      result.current.setValue('name', 'John Doe')
    })
    
    expect(result.current.fields.name.value).toBe('John Doe')
  })

  it('validates required fields', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    )
    
    act(() => {
      const isValid = result.current.validateAll()
      expect(isValid).toBe(false)
    })
    
    expect(result.current.fields.name.error).toContain('required')
    expect(result.current.fields.email.error).toContain('required')
  })

  it('validates minimum length', () => {
    const nonRequiredRules = {
      name: { minLength: 2 }, // Remove required to test minLength specifically
      email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      age: { custom: (value: number | null) => value !== null && value < 18 ? 'Must be 18 or older' : null },
    }
    
    const { result } = renderHook(() => 
      useFormValidation(initialValues, nonRequiredRules)
    )
    
    act(() => {
      result.current.setValue('name', 'A') // Set a short value first
    })
    
    let isValid: boolean
    act(() => {
      isValid = result.current.validateField('name')
    })
    
    expect(isValid!).toBe(false) // Should be false when validation fails
    expect(result.current.fields.name.error).toContain('at least 2 characters')
  })

  it('validates email pattern', () => {
    const nonRequiredRules = {
      name: { minLength: 2 },
      email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }, // Remove required to test pattern specifically
      age: { custom: (value: number | null) => value !== null && value < 18 ? 'Must be 18 or older' : null },
    }
    
    const { result } = renderHook(() => 
      useFormValidation(initialValues, nonRequiredRules)
    )
    
    act(() => {
      result.current.setValue('email', 'invalid-email') // Set invalid email
    })
    
    let isValid: boolean
    act(() => {
      isValid = result.current.validateField('email')
    })
    
    expect(isValid!).toBe(false)
    expect(result.current.fields.email.error).toContain('format is invalid')
  })

  it('validates custom rules', () => {
    const nonRequiredRules = {
      name: { minLength: 2 },
      email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      age: { custom: (value: number | null) => value !== null && value < 18 ? 'Must be 18 or older' : null }, // Remove required to test custom specifically
    }
    
    const { result } = renderHook(() => 
      useFormValidation(initialValues, nonRequiredRules)
    )
    
    act(() => {
      result.current.setValue('age', 16) // Set age under 18
    })
    
    let isValid: boolean
    act(() => {
      isValid = result.current.validateField('age')
    })
    
    expect(isValid!).toBe(false)
    expect(result.current.fields.age.error).toBe('Must be 18 or older')
  })

  it('returns form values', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    )
    
    act(() => {
      result.current.setValue('name', 'John Doe')
      result.current.setValue('email', 'john@example.com')
      result.current.setValue('age', 25)
    })
    
    const values = result.current.getValues()
    expect(values).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
      age: 25,
    })
  })

  it('resets form to initial values', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    )
    
    act(() => {
      result.current.setValue('name', 'John Doe')
      result.current.setError('name', 'Some error')
      result.current.reset()
    })
    
    expect(result.current.fields.name.value).toBe('')
    expect(result.current.fields.name.error).toBeUndefined()
  })

  it('sets field errors manually', () => {
    const { result } = renderHook(() => 
      useFormValidation(initialValues, validationRules)
    )
    
    act(() => {
      result.current.setError('name', 'Custom error message')
    })
    
    expect(result.current.fields.name.error).toBe('Custom error message')
  })
})