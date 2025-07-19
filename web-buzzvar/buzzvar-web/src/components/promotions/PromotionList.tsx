'use client'

import { useState, useEffect } from 'react'
import { PromotionService, PromotionWithStatus } from '@/services/promotionService'
import { PromotionFilters } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { 
  Calendar, 
  Clock, 
  Edit, 
  Trash2, 
  Copy, 
  MoreVertical, 
  Plus, 
  Filter,
  Search,
  Eye,
  EyeOff,
  CheckSquare,
  Square
} from 'lucide-react'
import { format } from 'date-fns'

interface PromotionListProps {
  venueId: string
  onEdit: (promotion: PromotionWithStatus) => void
  onCreateNew: () => void
}

export function PromotionList({ venueId, onEdit, onCreateNew }: PromotionListProps) {
  const [promotions, setPromotions] = useState<PromotionWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPromotions, setSelectedPromotions] = useState<string[]>([])
  const [filters, setFilters] = useState<PromotionFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [promotionToDelete, setPromotionToDelete] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadPromotions()
  }, [venueId, filters])

  const loadPromotions = async () => {
    try {
      setLoading(true)
      const data = await PromotionService.getVenuePromotions(venueId, filters)
      
      // Apply search filter
      const filteredData = searchTerm 
        ? data.filter(p => 
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : data

      setPromotions(filteredData)
    } catch (error) {
      console.error('Failed to load promotions:', error)
      toast.error('Failed to load promotions')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (promotionId: string) => {
    try {
      await PromotionService.deletePromotion(promotionId)
      toast.success('Promotion deleted successfully')
      loadPromotions()
    } catch (error) {
      console.error('Failed to delete promotion:', error)
      toast.error('Failed to delete promotion')
    }
  }

  const handleToggleStatus = async (promotionId: string, currentStatus: boolean) => {
    try {
      await PromotionService.togglePromotionStatus(promotionId, !currentStatus)
      toast.success(`Promotion ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      loadPromotions()
    } catch (error) {
      console.error('Failed to toggle promotion status:', error)
      toast.error('Failed to update promotion status')
    }
  }

  const handleDuplicate = async (promotionId: string) => {
    try {
      await PromotionService.duplicatePromotion(promotionId)
      toast.success('Promotion duplicated successfully')
      loadPromotions()
    } catch (error) {
      console.error('Failed to duplicate promotion:', error)
      toast.error('Failed to duplicate promotion')
    }
  }

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedPromotions.length === 0) {
      toast.error('Please select promotions first')
      return
    }

    try {
      if (action === 'delete') {
        await Promise.all(selectedPromotions.map(id => PromotionService.deletePromotion(id)))
        toast.success(`${selectedPromotions.length} promotions deleted`)
      } else {
        await PromotionService.bulkUpdatePromotions(selectedPromotions, {
          is_active: action === 'activate'
        })
        toast.success(`${selectedPromotions.length} promotions ${action}d`)
      }
      
      setSelectedPromotions([])
      loadPromotions()
    } catch (error) {
      console.error(`Failed to ${action} promotions:`, error)
      toast.error(`Failed to ${action} promotions`)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      scheduled: 'secondary',
      expired: 'destructive'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getPromotionTypeBadge = (type: string) => {
    const colors = {
      discount: 'bg-green-100 text-green-800',
      event: 'bg-blue-100 text-blue-800',
      special: 'bg-purple-100 text-purple-800',
      happy_hour: 'bg-orange-100 text-orange-800'
    }

    return (
      <Badge className={colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {type.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const formatDaysOfWeek = (days: number[]) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return days.map(day => dayNames[day]).join(', ')
  }

  const togglePromotionSelection = (promotionId: string) => {
    setSelectedPromotions(prev => 
      prev.includes(promotionId)
        ? prev.filter(id => id !== promotionId)
        : [...prev, promotionId]
    )
  }

  const toggleSelectAll = () => {
    setSelectedPromotions(
      selectedPromotions.length === promotions.length 
        ? [] 
        : promotions.map(p => p.id)
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Promotions</h2>
          <Badge variant="outline">{promotions.length}</Badge>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={onCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            New Promotion
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search promotions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <Select
                  value={filters.type || ''}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, type: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    <SelectItem value="discount">Discount</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="special">Special</SelectItem>
                    <SelectItem value="happy_hour">Happy Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select
                  value={filters.is_active?.toString() || ''}
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    is_active: value === '' ? undefined : value === 'true' 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setFilters({})}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedPromotions.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedPromotions.length} promotion(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('activate')}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Activate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('deactivate')}
                >
                  <EyeOff className="h-4 w-4 mr-1" />
                  Deactivate
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Select All */}
      {promotions.length > 0 && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedPromotions.length === promotions.length}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm text-gray-600">Select all</span>
        </div>
      )}

      {/* Promotions List */}
      {promotions.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No promotions found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || Object.keys(filters).length > 0
                  ? 'Try adjusting your search or filters'
                  : 'Create your first promotion to get started'
                }
              </p>
              {!searchTerm && Object.keys(filters).length === 0 && (
                <Button onClick={onCreateNew} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Promotion
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {promotions.map((promotion) => (
            <Card key={promotion.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedPromotions.includes(promotion.id)}
                      onCheckedChange={() => togglePromotionSelection(promotion.id)}
                    />
                    <div className="flex-1">
                      <CardTitle className="text-lg">{promotion.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusBadge(promotion.status)}
                        {getPromotionTypeBadge(promotion.promotion_type)}
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(promotion)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(promotion.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleToggleStatus(promotion.id, promotion.is_active)}
                      >
                        {promotion.is_active ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          setPromotionToDelete(promotion.id)
                          setDeleteDialogOpen(true)
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-gray-600 mb-4">{promotion.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>
                      {format(new Date(promotion.start_date), 'MMM d, yyyy')} - {' '}
                      {format(new Date(promotion.end_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  
                  {promotion.start_time && promotion.end_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{promotion.start_time} - {promotion.end_time}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Days:</span>
                    <span>{formatDaysOfWeek(promotion.days_of_week)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promotion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this promotion? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (promotionToDelete) {
                  handleDelete(promotionToDelete)
                  setPromotionToDelete(null)
                  setDeleteDialogOpen(false)
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}