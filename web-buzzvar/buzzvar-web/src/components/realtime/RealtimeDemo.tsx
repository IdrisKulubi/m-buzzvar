'use client'

import { useState, useEffect } from 'react'
import { useRealtime, useVenueUpdates, useVibeChecks, usePromotions, useNotifications } from '@/lib/realtime/hooks'
import { VenueUpdate, VibeCheckUpdate, PromotionUpdate, NotificationData } from '@/lib/realtime/realtime-service'

interface RealtimeDemoProps {
  wsUrl: string
  userId?: string
  venueId?: string
}

export function RealtimeDemo({ wsUrl, userId, venueId }: RealtimeDemoProps) {
  const [venueUpdates, setVenueUpdates] = useState<VenueUpdate[]>([])
  const [vibeChecks, setVibeChecks] = useState<VibeCheckUpdate[]>([])
  const [promotions, setPromotions] = useState<PromotionUpdate[]>([])
  const [notifications, setNotifications] = useState<NotificationData[]>([])

  const { service, isConnected, error } = useRealtime(wsUrl, userId)

  // Handle venue updates
  useVenueUpdates(service, (update) => {
    setVenueUpdates(prev => [update, ...prev.slice(0, 9)])
  })

  // Handle vibe checks for specific venue
  useVibeChecks(service, venueId || 'demo-venue', (vibeCheck) => {
    setVibeChecks(prev => [vibeCheck, ...prev.slice(0, 9)])
  })

  // Handle promotions for specific venue
  usePromotions(service, venueId || 'demo-venue', (promotion) => {
    setPromotions(prev => [promotion, ...prev.slice(0, 4)])
  })

  // Handle notifications
  useNotifications(service, (notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 9)])
  })

  const sendTestBroadcast = async () => {
    try {
      await fetch('/api/websocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'broadcast',
          channel: 'venue_updates',
          data: {
            id: 'test-venue-' + Date.now(),
            name: 'Test Venue Update',
            description: 'This is a test venue update',
            status: 'active',
            updatedAt: new Date().toISOString(),
            updatedBy: userId || 'demo-user'
          }
        })
      })
    } catch (error) {
      console.error('Failed to send test broadcast:', error)
    }
  }

  const sendTestNotification = async () => {
    if (!userId) return
    
    try {
      await fetch('/api/websocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'notify',
          userId,
          data: {
            id: 'test-notification-' + Date.now(),
            type: 'system',
            title: 'Test Notification',
            message: 'This is a test notification from the realtime system',
            createdAt: new Date().toISOString()
          }
        })
      })
    } catch (error) {
      console.error('Failed to send test notification:', error)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Realtime System Demo</h1>
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          {error && (
            <div className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
              Error: {error}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <button
          onClick={sendTestBroadcast}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Send Test Venue Update
        </button>
        <button
          onClick={sendTestNotification}
          disabled={!userId}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Send Test Notification
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Venue Updates */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Venue Updates ({venueUpdates.length})</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {venueUpdates.map((update, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                <div className="font-medium">{update.name}</div>
                <div className="text-gray-600">{update.description}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(update.updatedAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
            {venueUpdates.length === 0 && (
              <div className="text-gray-500 text-center py-4">No venue updates yet</div>
            )}
          </div>
        </div>

        {/* Vibe Checks */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Vibe Checks ({vibeChecks.length})</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {vibeChecks.map((vibeCheck, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                <div className="flex justify-between">
                  <span>Rating: {vibeCheck.rating}/5</span>
                  <span className="text-xs text-gray-500">
                    {new Date(vibeCheck.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                {vibeCheck.comment && (
                  <div className="text-gray-600 mt-1">{vibeCheck.comment}</div>
                )}
              </div>
            ))}
            {vibeChecks.length === 0 && (
              <div className="text-gray-500 text-center py-4">No vibe checks yet</div>
            )}
          </div>
        </div>

        {/* Promotions */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Promotions ({promotions.length})</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {promotions.map((promotion, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                <div className="font-medium">{promotion.title}</div>
                <div className="text-gray-600">{promotion.description}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(promotion.startDate).toLocaleDateString()} - {new Date(promotion.endDate).toLocaleDateString()}
                </div>
              </div>
            ))}
            {promotions.length === 0 && (
              <div className="text-gray-500 text-center py-4">No promotions yet</div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Notifications ({notifications.length})</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {notifications.map((notification, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                <div className="font-medium">{notification.title}</div>
                <div className="text-gray-600">{notification.message}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(notification.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="text-gray-500 text-center py-4">No notifications yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}