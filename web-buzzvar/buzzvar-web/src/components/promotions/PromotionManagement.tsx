'use client'

import { useState } from 'react'
import { PromotionList } from './PromotionList'
import { PromotionForm } from './PromotionForm'
import { ClientPromotionService, PromotionWithStatus } from '@/services/client/promotionService'
import { PromotionFormData } from '@/lib/types'
import { toast } from 'sonner'

interface PromotionManagementProps {
  initialVenueId: string | null
  userRole: string
  isAdmin: boolean
  isVenueOwner: boolean
}

export function PromotionManagement({ 
  initialVenueId, 
  userRole, 
  isAdmin, 
  isVenueOwner 
}: PromotionManagementProps) {
  const [selectedPromotion, setSelectedPromotion] = useState<PromotionWithStatus | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [currentVenueId, setCurrentVenueId] = useState(initialVenueId)

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
    if (!currentVenueId || currentVenueId === 'admin-view') return

    try {
      setIsSubmitting(true)
      
      if (selectedPromotion) {
        // Update existing promotion
        await ClientPromotionService.updatePromotion(selectedPromotion.id, data)
        toast.success('Promotion updated successfully')
      } else {
        // Create new promotion
        await ClientPromotionService.createPromotion({ ...data, venue_id: currentVenueId })
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

  if (!currentVenueId || currentVenueId === 'admin-view') {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {isAdmin ? 'Select a Venue' : 'No Venue Selected'}
          </h2>
          <p className="text-gray-600">
            {isAdmin 
              ? 'Choose a venue to manage its promotions' 
              : 'Please select a venue to manage promotions'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showForm ? (
        <PromotionForm
          venueId={currentVenueId}
          promotion={selectedPromotion}
          onSubmit={handleSubmitPromotion}
          onCancel={handleCloseForm}
          isSubmitting={isSubmitting}
        />
      ) : (
        <PromotionList
          key={refreshKey}
          venueId={currentVenueId}
          onEdit={handleEditPromotion}
          onCreateNew={handleCreateNew}
        />
      )}
    </div>
  )
}