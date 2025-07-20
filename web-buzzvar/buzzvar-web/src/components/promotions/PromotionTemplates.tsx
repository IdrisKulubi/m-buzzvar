'use client'

import { useState } from 'react'
import { ClientPromotionService } from '@/services/client/promotionService'
import { PromotionFormData } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Clock, 
  Calendar, 
  Percent, 
  Music, 
  GraduationCap, 
  Star,
  FileText
} from 'lucide-react'

interface PromotionTemplatesProps {
  onSelectTemplate: (templateData: Partial<PromotionFormData>) => void
}

export function PromotionTemplates({ onSelectTemplate }: PromotionTemplatesProps) {
  const [open, setOpen] = useState(false)
  const templates = ClientPromotionService.getPromotionTemplates()

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'happy_hour':
        return <Clock className="h-6 w-6" />
      case 'event':
        return <Music className="h-6 w-6" />
      case 'discount':
        return <Percent className="h-6 w-6" />
      case 'special':
        return <Star className="h-6 w-6" />
      default:
        return <FileText className="h-6 w-6" />
    }
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'happy_hour':
        return 'bg-orange-100 text-orange-800'
      case 'event':
        return 'bg-blue-100 text-blue-800'
      case 'discount':
        return 'bg-green-100 text-green-800'
      case 'special':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDaysOfWeek = (days: number[]) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return days.map(day => dayNames[day]).join(', ')
  }

  const handleSelectTemplate = (template: any) => {
    onSelectTemplate(template.defaultData)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Use Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose a Promotion Template</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {templates.map((template) => (
            <Card 
              key={template.id} 
              className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/50"
              onClick={() => handleSelectTemplate(template)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {getTemplateIcon(template.type)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge className={getTypeBadgeColor(template.type)}>
                        {template.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-gray-600 mb-4">{template.description}</p>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium">Title:</span>
                    <span className="ml-2 text-gray-600">{template.defaultData.title}</span>
                  </div>
                  
                  <div>
                    <span className="font-medium">Description:</span>
                    <span className="ml-2 text-gray-600">{template.defaultData.description}</span>
                  </div>
                  
                  {template.defaultData.days_of_week && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">Days:</span>
                      <span className="text-gray-600">
                        {formatDaysOfWeek(template.defaultData.days_of_week)}
                      </span>
                    </div>
                  )}
                  
                  {template.defaultData.start_time && template.defaultData.end_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">Time:</span>
                      <span className="text-gray-600">
                        {template.defaultData.start_time} - {template.defaultData.end_time}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    className="w-full" 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectTemplate(template)
                    }}
                  >
                    Use This Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Tip:</strong> Templates provide a starting point for common promotion types. 
            You can customize all fields after selecting a template.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}