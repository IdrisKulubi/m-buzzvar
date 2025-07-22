import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useRealtime, useVenueUpdates, useVibeChecks, usePromotions, useNotifications } from '../lib/realtime/hooks'
import { VenueUpdate, VibeCheckUpdate, PromotionUpdate, NotificationData } from '../lib/realtime/realtime-service-mobile'

interface RealtimeDemoProps {
  wsUrl: string
  apiBaseUrl: string
  userId?: string
  venueId?: string
}

export function RealtimeDemo({ wsUrl, apiBaseUrl, userId, venueId }: RealtimeDemoProps) {
  const [venueUpdates, setVenueUpdates] = useState<VenueUpdate[]>([])
  const [vibeChecks, setVibeChecks] = useState<VibeCheckUpdate[]>([])
  const [promotions, setPromotions] = useState<PromotionUpdate[]>([])
  const [notifications, setNotifications] = useState<NotificationData[]>([])

  const { service, isConnected, error } = useRealtime(wsUrl, apiBaseUrl, userId)

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
      await fetch(`${apiBaseUrl}/api/websocket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'broadcast',
          channel: 'venue_updates',
          data: {
            id: 'test-venue-' + Date.now(),
            name: 'Test Venue Update',
            description: 'This is a test venue update from mobile',
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
      await fetch(`${apiBaseUrl}/api/websocket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'notify',
          userId,
          data: {
            id: 'test-notification-' + Date.now(),
            type: 'system',
            title: 'Test Mobile Notification',
            message: 'This is a test notification from the mobile app',
            createdAt: new Date().toISOString()
          }
        })
      })
    } catch (error) {
      console.error('Failed to send test notification:', error)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Realtime System Demo</Text>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: isConnected ? '#dcfce7' : '#fecaca' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: isConnected ? '#166534' : '#dc2626' }
            ]}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
          {error && (
            <View style={[styles.statusBadge, { backgroundColor: '#fef3c7' }]}>
              <Text style={[styles.statusText, { color: '#d97706' }]}>
                Error: {error}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={sendTestBroadcast}>
          <Text style={styles.buttonText}>Send Test Venue Update</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, { opacity: userId ? 1 : 0.5 }]} 
          onPress={sendTestNotification}
          disabled={!userId}
        >
          <Text style={styles.buttonText}>Send Test Notification</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionsContainer}>
        {/* Venue Updates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Venue Updates ({venueUpdates.length})</Text>
          <ScrollView style={styles.sectionContent} nestedScrollEnabled>
            {venueUpdates.map((update, index) => (
              <View key={index} style={styles.updateItem}>
                <Text style={styles.updateTitle}>{update.name}</Text>
                <Text style={styles.updateDescription}>{update.description}</Text>
                <Text style={styles.updateTime}>
                  {new Date(update.updatedAt).toLocaleTimeString()}
                </Text>
              </View>
            ))}
            {venueUpdates.length === 0 && (
              <Text style={styles.emptyText}>No venue updates yet</Text>
            )}
          </ScrollView>
        </View>

        {/* Vibe Checks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vibe Checks ({vibeChecks.length})</Text>
          <ScrollView style={styles.sectionContent} nestedScrollEnabled>
            {vibeChecks.map((vibeCheck, index) => (
              <View key={index} style={styles.updateItem}>
                <View style={styles.vibeCheckHeader}>
                  <Text>Rating: {vibeCheck.rating}/5</Text>
                  <Text style={styles.updateTime}>
                    {new Date(vibeCheck.createdAt).toLocaleTimeString()}
                  </Text>
                </View>
                {vibeCheck.comment && (
                  <Text style={styles.updateDescription}>{vibeCheck.comment}</Text>
                )}
              </View>
            ))}
            {vibeChecks.length === 0 && (
              <Text style={styles.emptyText}>No vibe checks yet</Text>
            )}
          </ScrollView>
        </View>

        {/* Promotions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promotions ({promotions.length})</Text>
          <ScrollView style={styles.sectionContent} nestedScrollEnabled>
            {promotions.map((promotion, index) => (
              <View key={index} style={styles.updateItem}>
                <Text style={styles.updateTitle}>{promotion.title}</Text>
                <Text style={styles.updateDescription}>{promotion.description}</Text>
                <Text style={styles.updateTime}>
                  {new Date(promotion.startDate).toLocaleDateString()} - {new Date(promotion.endDate).toLocaleDateString()}
                </Text>
              </View>
            ))}
            {promotions.length === 0 && (
              <Text style={styles.emptyText}>No promotions yet</Text>
            )}
          </ScrollView>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications ({notifications.length})</Text>
          <ScrollView style={styles.sectionContent} nestedScrollEnabled>
            {notifications.map((notification, index) => (
              <View key={index} style={styles.updateItem}>
                <Text style={styles.updateTitle}>{notification.title}</Text>
                <Text style={styles.updateDescription}>{notification.message}</Text>
                <Text style={styles.updateTime}>
                  {new Date(notification.createdAt).toLocaleTimeString()}
                </Text>
              </View>
            ))}
            {notifications.length === 0 && (
              <Text style={styles.emptyText}>No notifications yet</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
  },
  sectionsContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionContent: {
    maxHeight: 200,
  },
  updateItem: {
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  updateTitle: {
    fontWeight: '500',
    marginBottom: 4,
  },
  updateDescription: {
    color: '#6b7280',
    marginBottom: 4,
  },
  updateTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  vibeCheckHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 16,
  },
})