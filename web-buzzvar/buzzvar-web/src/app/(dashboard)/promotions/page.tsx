'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { PromotionList } from '@/components/promotions/PromotionList'
import { PromotionForm } from '@/components/promotions/PromotionForm'
import { PromotionService, PromotionWithStatus } from '@/services/promotionService'
import { PromotionFormData } from '@/lib/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { AlertCircle } from 'lucide-react'

export default function PromotionsPage() {
  const { user, loading } = useAuth()
  const [selectedPromotion, setSelectedPromotion] = useState<PromotionWithStatus | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!user || (user.role !== 'venue_owner' && user.role !== 'admin')) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need to be a venue owner to access promotion management.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // For now, use the first venue if user is a venue owner
  const venueId = user.role === 'venue_owner' && user.venues?.[0]?.venue_id

  if (user.role === 'venue_owner' && !venueId) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No venue found. Please register your venue first.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const handleEditPromotion = (promotion: PromotionWithStatus) => {
    setSelectedPromotion(promotion)
    setShowForm(true)
  }

  const handleCreateNew = () => {
    setSelectedPromotion(null)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setSelectedPromotion(null)
    setShowForm(false)
  }

  const handleSubmitPromotion = async (data: PromotionFormData) => {
    if (!venueId) return

    try {
      setIsSubmitting(true)
      
      if (selectedPromotion) {
        // Update existing promotion
        await PromotionService.updatePromotion(selectedPromotion.id, data)
        toast.success('Promotion updated successfully')
      } else {
        // Create new promotion
        await PromotionService.createPromotion(venueId, data)
        toast.success('Promotion created successfully')
      }
      
      handleCloseForm()
      setRefreshKey(prev => prev + 1) // Trigger refresh of promotion list
    } catch (error) {
      console.error('Failed to save promotion:', error)
      toast.error('Failed to save promotion')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      {showForm ? (
        <PromotionForm
          venueId={venueId || 'demo-venue'}
          promotion={selectedPromotion}
          onSubmit={handleSubmitPromotion}
          onCancel={handleCloseForm}
          isSubmitting={isSubmitting}
        />
      ) : (
        <PromotionList
          key={refreshKey}
          venueId={venueId || 'demo-venue'}
          onEdit={handleEditPromotion}
          onCreateNew={handleCreateNew}
        />
      )}
    </div>
  )
}