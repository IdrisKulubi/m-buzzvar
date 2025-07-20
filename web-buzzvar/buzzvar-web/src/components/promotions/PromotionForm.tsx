'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ClientPromotionService, PromotionWithStatus } from '@/services/client/promotionService'
import { PromotionFormData } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileUpload } from '@/components/ui/file-upload'
import { PromotionTemplates } from './PromotionTemplates'
import { toast } from 'sonner'
import { 
  CalendarIcon, 
  Clock, 
  Save, 
  X, 
  Eye, 
  AlertCircle,
  Smartphone,
  Upload
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

const promotionFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  days_of_week: z.array(z.number().min(0).max(6)).min(1, 'At least one day must be selected'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  promotion_type: z.enum(['discount', 'event', 'special', 'happy_hour'], {
    required_error: 'Promotion type is required'
  })
}).refine((data) => {
  const startDate = new Date(data.start_date)
  const endDate = new Date(data.end_date)
  return endDate > startDate
}, {
  message: "End date must be after start date",
  path: ["end_date"],
}).refine((data) => {
  if (data.start_time && data.end_time) {
    return data.end_time > data.start_time
  }
  return true
}, {
  message: "End time must be after start time",
  path: ["end_time"],
})

interface PromotionFormProps {
  venueId: string
  promotion?: PromotionWithStatus
  onSubmit: (data: PromotionFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export function PromotionForm({ 
  venueId, 
  promotion, 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}: PromotionFormProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)

  const form = useForm<PromotionFormData>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: {
      title: promotion?.title || '',
      description: promotion?.description || '',
      start_date: promotion?.start_date || '',
      end_date: promotion?.end_date || '',
      days_of_week: promotion?.days_of_week || [],
      start_time: promotion?.start_time || '',
      end_time: promotion?.end_time || '',
      promotion_type: promotion?.promotion_type || 'discount'
    }
  })

  const { watch, setValue, formState: { errors, isDirty } } = form

  const watchedValues = watch()

  useEffect(() => {
    setHasUnsavedChanges(isDirty)
  }, [isDirty])

  useEffect(() => {
    if (promotion?.image_url) {
      setImagePreview(promotion.image_url)
    }
  }, [promotion])

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveEnabled && hasUnsavedChanges && promotion) {
      const timeoutId = setTimeout(() => {
        handleAutoSave()
      }, 2000) // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId)
    }
  }, [watchedValues, autoSaveEnabled, hasUnsavedChanges, promotion])

  // Check for promotion conflicts
  useEffect(() => {
    if (watchedValues.start_date && watchedValues.end_date && watchedValues.days_of_week.length > 0) {
      checkForConflicts()
    }
  }, [watchedValues.start_date, watchedValues.end_date, watchedValues.days_of_week])

  const handleAutoSave = async () => {
    if (!promotion) return

    try {
      const formData = form.getValues()
      await ClientPromotionService.updatePromotion(promotion.id, formData)
      toast.success('Changes saved automatically')
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }

  const checkForConflicts = async () => {
    try {
      const existingPromotions = await ClientPromotionService.getPromotions({
        venue_id: venueId,
        start_date: watchedValues.start_date,
        end_date: watchedValues.end_date
      })

      const conflicts = existingPromotions.filter(p => {
        if (promotion && p.id === promotion.id) return false
        
        const hasOverlappingDays = p.days_of_week.some(day => 
          watchedValues.days_of_week.includes(day)
        )
        
        const hasOverlappingTime = !watchedValues.start_time || !watchedValues.end_time || 
          !p.start_time || !p.end_time ||
          (watchedValues.start_time < p.end_time && watchedValues.end_time > p.start_time)

        return hasOverlappingDays && hasOverlappingTime
      })

      if (conflicts.length > 0) {
        setConflictWarning(`This promotion may conflict with ${conflicts.length} existing promotion(s)`)
      } else {
        setConflictWarning(null)
      }
    } catch (error) {
      console.error('Failed to check conflicts:', error)
    }
  }

  const handleImageUpload = (file: File) => {
    setUploadedImage(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleTemplateSelect = (templateData: Partial<PromotionFormData>) => {
    Object.entries(templateData).forEach(([key, value]) => {
      setValue(key as keyof PromotionFormData, value as any, { shouldDirty: true })
    })
    toast.success('Template applied successfully')
  }

  const handleSubmit = async (data: PromotionFormData) => {
    try {
      const formData = {
        ...data,
        image: uploadedImage || undefined
      }
      
      await onSubmit(formData)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Form submission failed:', error)
    }
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const getPromotionTypeIcon = (type: string) => {
    switch (type) {
      case 'happy_hour': return '🍻'
      case 'event': return '🎵'
      case 'discount': return '💰'
      case 'special': return '⭐'
      default: return '🎉'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {promotion ? 'Edit Promotion' : 'Create New Promotion'}
          </h2>
          {hasUnsavedChanges && (
            <p className="text-sm text-orange-600 mt-1">
              You have unsaved changes
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          {!promotion && <PromotionTemplates onSelectTemplate={handleTemplateSelect} />}
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Hide Preview' : 'Preview'}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>

      {/* Conflict Warning */}
      {conflictWarning && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{conflictWarning}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Promotion Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    {...form.register('title')}
                    placeholder="Enter promotion title"
                    className={errors.title ? 'border-red-500' : ''}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder="Describe your promotion..."
                    rows={4}
                    className={errors.description ? 'border-red-500' : ''}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.description && (
                      <p className="text-sm text-red-500">{errors.description.message}</p>
                    )}
                    <p className="text-sm text-gray-500 ml-auto">
                      {watchedValues.description?.length || 0}/500
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="promotion_type">Promotion Type *</Label>
                  <Select
                    value={watchedValues.promotion_type}
                    onValueChange={(value) => setValue('promotion_type', value as any, { shouldDirty: true })}
                  >
                    <SelectTrigger className={errors.promotion_type ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select promotion type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discount">
                        <div className="flex items-center gap-2">
                          <span>💰</span>
                          <span>Discount</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="event">
                        <div className="flex items-center gap-2">
                          <span>🎵</span>
                          <span>Event</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="special">
                        <div className="flex items-center gap-2">
                          <span>⭐</span>
                          <span>Special</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="happy_hour">
                        <div className="flex items-center gap-2">
                          <span>🍻</span>
                          <span>Happy Hour</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.promotion_type && (
                    <p className="text-sm text-red-500 mt-1">{errors.promotion_type.message}</p>
                  )}
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Schedule</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !watchedValues.start_date && "text-muted-foreground",
                            errors.start_date && "border-red-500"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {watchedValues.start_date ? (
                            format(new Date(watchedValues.start_date), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={watchedValues.start_date ? new Date(watchedValues.start_date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setValue('start_date', format(date, 'yyyy-MM-dd'), { shouldDirty: true })
                            }
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.start_date && (
                      <p className="text-sm text-red-500 mt-1">{errors.start_date.message}</p>
                    )}
                  </div>

                  <div>
                    <Label>End Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !watchedValues.end_date && "text-muted-foreground",
                            errors.end_date && "border-red-500"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {watchedValues.end_date ? (
                            format(new Date(watchedValues.end_date), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={watchedValues.end_date ? new Date(watchedValues.end_date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setValue('end_date', format(date, 'yyyy-MM-dd'), { shouldDirty: true })
                            }
                          }}
                          disabled={(date) => {
                            const startDate = watchedValues.start_date ? new Date(watchedValues.start_date) : new Date()
                            return date < startDate
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.end_date && (
                      <p className="text-sm text-red-500 mt-1">{errors.end_date.message}</p>
                    )}
                  </div>
                </div>

                {/* Days of Week */}
                <div>
                  <Label>Days of Week *</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {dayNames.map((day, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${index}`}
                          checked={watchedValues.days_of_week.includes(index)}
                          onCheckedChange={(checked) => {
                            const currentDays = watchedValues.days_of_week
                            const newDays = checked
                              ? [...currentDays, index]
                              : currentDays.filter(d => d !== index)
                            setValue('days_of_week', newDays, { shouldDirty: true })
                          }}
                        />
                        <Label htmlFor={`day-${index}`} className="text-sm">
                          {day.slice(0, 3)}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {errors.days_of_week && (
                    <p className="text-sm text-red-500 mt-1">{errors.days_of_week.message}</p>
                  )}
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_time">Start Time</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="start_time"
                        type="time"
                        {...form.register('start_time')}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="end_time">End Time</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="end_time"
                        type="time"
                        {...form.register('end_time')}
                        className="pl-10"
                      />
                    </div>
                    {errors.end_time && (
                      <p className="text-sm text-red-500 mt-1">{errors.end_time.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Media</h3>
                
                <div>
                  <Label>Promotion Image</Label>
                  <FileUpload
                    onFileSelect={handleImageUpload}
                    accept="image/*"
                    maxSize={5 * 1024 * 1024} // 5MB
                    className="mt-2"
                  >
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </div>
                  </FileUpload>
                  
                  {imagePreview && (
                    <div className="mt-4">
                      <img
                        src={imagePreview}
                        alt="Promotion preview"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Auto-save Toggle */}
              {promotion && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-save"
                    checked={autoSaveEnabled}
                    onCheckedChange={setAutoSaveEnabled}
                  />
                  <Label htmlFor="auto-save" className="text-sm">
                    Enable auto-save
                  </Label>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSubmitting ? 'Saving...' : (promotion ? 'Update Promotion' : 'Create Promotion')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview */}
        {showPreview && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Mobile App Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                {/* Promotion Card Preview */}
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {watchedValues.title || 'Promotion Title'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">
                          {getPromotionTypeIcon(watchedValues.promotion_type)}
                          {watchedValues.promotion_type?.replace('_', ' ').toUpperCase() || 'TYPE'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {imagePreview && (
                    <div className="mb-3">
                      <img
                        src={imagePreview}
                        alt="Promotion"
                        className="w-full h-32 object-cover rounded-md"
                      />
                    </div>
                  )}

                  <p className="text-gray-600 text-sm mb-3">
                    {watchedValues.description || 'Promotion description will appear here...'}
                  </p>

                  <div className="space-y-2 text-xs text-gray-500">
                    {watchedValues.start_date && watchedValues.end_date && (
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        <span>
                          {format(new Date(watchedValues.start_date), 'MMM d')} - {' '}
                          {format(new Date(watchedValues.end_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}

                    {watchedValues.days_of_week.length > 0 && (
                      <div>
                        <span>Days: </span>
                        {watchedValues.days_of_week.map(day => dayNames[day].slice(0, 3)).join(', ')}
                      </div>
                    )}

                    {watchedValues.start_time && watchedValues.end_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{watchedValues.start_time} - {watchedValues.end_time}</span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  This is how your promotion will appear in the mobile app
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}