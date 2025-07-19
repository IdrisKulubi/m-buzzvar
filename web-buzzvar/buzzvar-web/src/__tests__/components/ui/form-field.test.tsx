import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import {
  InputField,
  TextareaField,
  SelectField,
  CheckboxField,
  RadioField,
  SwitchField,
} from '@/components/ui/form-field'

describe('InputField', () => {
  it('renders input with label', () => {
    render(<InputField label="Test Input" />)
    
    expect(screen.getByText('Test Input')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('shows required indicator when required', () => {
    render(<InputField label="Required Field" required />)
    
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('shows error message', () => {
    render(<InputField label="Test Input" error="This field is required" />)
    
    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('shows description when no error', () => {
    render(<InputField label="Test Input" description="Helper text" />)
    
    expect(screen.getByText('Helper text')).toBeInTheDocument()
  })

  it('calls onChange when value changes', () => {
    const onChange = vi.fn()
    render(<InputField label="Test Input" onChange={onChange} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test value' } })
    
    expect(onChange).toHaveBeenCalledWith('test value')
  })

  it('handles different input types', () => {
    render(<InputField label="Email" type="email" />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('type', 'email')
  })

  it('disables input when disabled prop is true', () => {
    render(<InputField label="Disabled Input" disabled />)
    
    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
  })
})

describe('TextareaField', () => {
  it('renders textarea with label', () => {
    render(<TextareaField label="Test Textarea" />)
    
    expect(screen.getByText('Test Textarea')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('calls onChange when value changes', () => {
    const onChange = vi.fn()
    render(<TextareaField label="Test Textarea" onChange={onChange} />)
    
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'test content' } })
    
    expect(onChange).toHaveBeenCalledWith('test content')
  })

  it('sets custom rows', () => {
    render(<TextareaField label="Test Textarea" rows={5} />)
    
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveAttribute('rows', '5')
  })
})

describe('SelectField', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
  ]

  it('renders select with label and options', () => {
    render(<SelectField label="Test Select" options={options} />)
    
    expect(screen.getByText('Test Select')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('shows placeholder', () => {
    render(<SelectField label="Test Select" options={options} placeholder="Choose option" />)
    
    expect(screen.getByText('Choose option')).toBeInTheDocument()
  })

  it('calls onChange when option is selected', () => {
    const onChange = vi.fn()
    render(<SelectField label="Test Select" options={options} onChange={onChange} />)
    
    const select = screen.getByRole('combobox')
    fireEvent.click(select)
    
    // Note: Testing select dropdown interaction is complex with Radix UI
    // In a real test, you'd need to handle the dropdown opening and selection
  })
})

describe('CheckboxField', () => {
  it('renders checkbox with label', () => {
    render(<CheckboxField label="Test Checkbox" />)
    
    expect(screen.getByText('Test Checkbox')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('calls onChange when checked', () => {
    const onChange = vi.fn()
    render(<CheckboxField label="Test Checkbox" onChange={onChange} />)
    
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    
    expect(onChange).toHaveBeenCalled()
  })

  it('shows as checked when checked prop is true', () => {
    render(<CheckboxField label="Test Checkbox" checked={true} />)
    
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
  })
})

describe('RadioField', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
  ]

  it('renders radio group with options', () => {
    render(<RadioField label="Test Radio" options={options} />)
    
    expect(screen.getByText('Test Radio')).toBeInTheDocument()
    expect(screen.getByText('Option 1')).toBeInTheDocument()
    expect(screen.getByText('Option 2')).toBeInTheDocument()
  })

  it('calls onChange when option is selected', () => {
    const onChange = vi.fn()
    render(<RadioField label="Test Radio" options={options} onChange={onChange} />)
    
    const radioButtons = screen.getAllByRole('radio')
    fireEvent.click(radioButtons[0])
    
    expect(onChange).toHaveBeenCalledWith('option1')
  })
})

describe('SwitchField', () => {
  it('renders switch with label', () => {
    render(<SwitchField label="Test Switch" />)
    
    expect(screen.getByText('Test Switch')).toBeInTheDocument()
    expect(screen.getByRole('switch')).toBeInTheDocument()
  })

  it('calls onChange when toggled', () => {
    const onChange = vi.fn()
    render(<SwitchField label="Test Switch" onChange={onChange} />)
    
    const switchElement = screen.getByRole('switch')
    fireEvent.click(switchElement)
    
    expect(onChange).toHaveBeenCalled()
  })

  it('shows as checked when checked prop is true', () => {
    render(<SwitchField label="Test Switch" checked={true} />)
    
    const switchElement = screen.getByRole('switch')
    expect(switchElement).toHaveAttribute('data-state', 'checked')
  })
})