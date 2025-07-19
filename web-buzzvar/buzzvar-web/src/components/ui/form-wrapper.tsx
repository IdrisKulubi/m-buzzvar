"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"

interface FormWrapperProps {
  title?: string
  description?: string
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void | Promise<void>
  isSubmitting?: boolean
  submitText?: string
  cancelText?: string
  onCancel?: () => void
  error?: string
  success?: string
  className?: string
  showCard?: boolean
  disabled?: boolean
}

export const FormWrapper: React.FC<FormWrapperProps> = ({
  title,
  description,
  children,
  onSubmit,
  isSubmitting = false,
  submitText = "Submit",
  cancelText = "Cancel",
  onCancel,
  error,
  success,
  className,
  showCard = true,
  disabled = false,
}) => {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting || disabled) return
    await onSubmit(e)
  }

  const formContent = (
    <>
      {(title || description) && showCard && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      
      <div className={showCard ? "px-6" : ""}>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </div>

      {showCard ? (
        <CardContent className="space-y-4">
          {children}
        </CardContent>
      ) : (
        <div className="space-y-4">
          {children}
        </div>
      )}

      {showCard ? (
        <CardFooter className="flex justify-end space-x-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              {cancelText}
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting || disabled}
            className="min-w-[100px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              submitText
            )}
          </Button>
        </CardFooter>
      ) : (
        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              {cancelText}
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting || disabled}
            className="min-w-[100px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              submitText
            )}
          </Button>
        </div>
      )}
    </>
  )

  if (showCard) {
    return (
      <Card className={cn("w-full max-w-2xl mx-auto", className)}>
        <form onSubmit={handleSubmit}>
          {formContent}
        </form>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={cn("w-full", className)}>
      {!showCard && (title || description) && (
        <div className="mb-6">
          {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
          {description && <p className="text-muted-foreground mt-2">{description}</p>}
        </div>
      )}
      {formContent}
    </form>
  )
}

// Hook for form validation
export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
}

export interface FormField {
  [key: string]: {
    value: any
    error?: string
    rules?: ValidationRule
  }
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules?: Record<keyof T, ValidationRule>
) {
  const [fields, setFields] = React.useState<FormField>(() => {
    const initialFields: FormField = {}
    Object.keys(initialValues).forEach(key => {
      initialFields[key] = {
        value: initialValues[key],
        error: undefined,
        rules: validationRules?.[key]
      }
    })
    return initialFields
  })

  // Update rules when validationRules change
  React.useEffect(() => {
    setFields(prev => {
      const updatedFields = { ...prev }
      Object.keys(updatedFields).forEach(key => {
        updatedFields[key] = {
          ...updatedFields[key],
          rules: validationRules?.[key]
        }
      })
      return updatedFields
    })
  }, [validationRules])

  const validateField = (name: string, value: any): string | null => {
    const rules = fields[name]?.rules
    if (!rules) return null

    const isEmpty = value === null || value === undefined || (typeof value === 'string' && value.trim() === '')

    // Check required first
    if (rules.required && isEmpty) {
      return `${name} is required`
    }

    // Skip other validations if empty and not required
    if (isEmpty) {
      return null
    }

    // Validate string rules
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        return `${name} must be at least ${rules.minLength} characters`
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        return `${name} must be no more than ${rules.maxLength} characters`
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        return `${name} format is invalid`
      }
    }

    // Custom validation
    if (rules.custom) {
      return rules.custom(value)
    }

    return null
  }

  const setValue = (name: string, value: any) => {
    setFields(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        value,
        error: undefined
      }
    }))
  }

  const setError = (name: string, error: string) => {
    setFields(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        error
      }
    }))
  }

  const validateAll = (): boolean => {
    let isValid = true
    const newFields = { ...fields }

    Object.keys(fields).forEach(name => {
      const error = validateField(name, fields[name].value)
      if (error) {
        newFields[name] = { ...newFields[name], error }
        isValid = false
      }
    })

    setFields(newFields)
    return isValid
  }

  const getValues = (): T => {
    const values = {} as T
    Object.keys(fields).forEach(key => {
      values[key as keyof T] = fields[key].value
    })
    return values
  }

  const reset = () => {
    setFields(prev => {
      const resetFields: FormField = {}
      Object.keys(prev).forEach(key => {
        resetFields[key] = {
          ...prev[key],
          value: initialValues[key as keyof T],
          error: undefined
        }
      })
      return resetFields
    })
  }

  return {
    fields,
    setValue,
    setError,
    validateAll,
    getValues,
    reset,
    validateField: (name: string) => {
      const error = validateField(name, fields[name]?.value)
      if (error) {
        setError(name, error)
      }
      return !error
    }
  }
}