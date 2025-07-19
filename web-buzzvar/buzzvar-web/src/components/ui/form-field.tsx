"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"

interface BaseFieldProps {
  label?: string
  description?: string
  error?: string
  required?: boolean
  className?: string
  disabled?: boolean
}

interface InputFieldProps extends BaseFieldProps {
  type?: "text" | "email" | "password" | "number" | "tel" | "url"
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
}

interface TextareaFieldProps extends BaseFieldProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  rows?: number
}

interface SelectFieldProps extends BaseFieldProps {
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  options: Array<{ value: string; label: string }>
}

interface CheckboxFieldProps extends BaseFieldProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
}

interface RadioFieldProps extends BaseFieldProps {
  value?: string
  onChange?: (value: string) => void
  options: Array<{ value: string; label: string }>
}

interface SwitchFieldProps extends BaseFieldProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
}

const FieldWrapper: React.FC<{
  children: React.ReactNode
  label?: string
  description?: string
  error?: string
  required?: boolean
  className?: string
}> = ({ children, label, description, error, required, className }) => {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className={cn("text-sm font-medium", error && "text-destructive")}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {children}
      {description && !error && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  description,
  error,
  required,
  className,
  disabled,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
}) => {
  return (
    <FieldWrapper
      label={label}
      description={description}
      error={error}
      required={required}
      className={className}
    >
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className={cn(error && "border-destructive focus-visible:ring-destructive")}
      />
    </FieldWrapper>
  )
}

export const TextareaField: React.FC<TextareaFieldProps> = ({
  label,
  description,
  error,
  required,
  className,
  disabled,
  placeholder,
  value,
  onChange,
  onBlur,
  rows = 3,
}) => {
  return (
    <FieldWrapper
      label={label}
      description={description}
      error={error}
      required={required}
      className={className}
    >
      <Textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        rows={rows}
        className={cn(error && "border-destructive focus-visible:ring-destructive")}
      />
    </FieldWrapper>
  )
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  description,
  error,
  required,
  className,
  disabled,
  placeholder,
  value,
  onChange,
  options,
}) => {
  return (
    <FieldWrapper
      label={label}
      description={description}
      error={error}
      required={required}
      className={className}
    >
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={cn(error && "border-destructive focus:ring-destructive")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldWrapper>
  )
}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  label,
  description,
  error,
  required,
  className,
  disabled,
  checked,
  onChange,
}) => {
  return (
    <FieldWrapper
      description={description}
      error={error}
      className={className}
    >
      <div className="flex items-center space-x-2">
        <Checkbox
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
          className={cn(error && "border-destructive")}
        />
        {label && (
          <Label className={cn("text-sm font-medium", error && "text-destructive")}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
      </div>
    </FieldWrapper>
  )
}

export const RadioField: React.FC<RadioFieldProps> = ({
  label,
  description,
  error,
  required,
  className,
  disabled,
  value,
  onChange,
  options,
}) => {
  return (
    <FieldWrapper
      label={label}
      description={description}
      error={error}
      required={required}
      className={className}
    >
      <RadioGroup value={value} onValueChange={onChange} disabled={disabled}>
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem value={option.value} />
            <Label className="text-sm font-normal">{option.label}</Label>
          </div>
        ))}
      </RadioGroup>
    </FieldWrapper>
  )
}

export const SwitchField: React.FC<SwitchFieldProps> = ({
  label,
  description,
  error,
  required,
  className,
  disabled,
  checked,
  onChange,
}) => {
  return (
    <FieldWrapper
      description={description}
      error={error}
      className={className}
    >
      <div className="flex items-center space-x-2">
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
        />
        {label && (
          <Label className={cn("text-sm font-medium", error && "text-destructive")}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
      </div>
    </FieldWrapper>
  )
}