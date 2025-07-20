import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest'
import { RealtimeServer } from '../lib/realtime/websocket-server'
import { RealtimeClient } from '../lib/realtime/websocket-client-web'
import { RealtimeService } from '../lib/realtime/realtime-service'

// Mock WebSocket for testing
global.WebSocket = vi.fn().mockImplementation(() => ({
  readyState: 1,
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}))

describe('Realtime System', () => {
  let server: RealtimeServer
  let client: RealtimeClient
  let service: RealtimeService

  beforeAll(async () => {
    // Start test server on different port
    server = new RealtimeServer(8081)
    
    // Wait a bit for server to start
    await new Promise(resolve => setTimeout(resolve, 100))
  })

  afterAll(() => {
    server?.close()
  })

  test('should create WebSocket server', () => {
    expect(server).toBeDefined()
    expect(server.getStats().totalClients).toBe(0)
  })

  test('should broadcast to channel', () => {
    const testData = { message: 'test broadcast' }
    
    // This should not throw
    expect(() => {
      server.broadcastToChannel('test_channel', testData)
    }).not.toThrow()
  })

  test('should send notification to user', () => {
    const testData = { message: 'test notification' }
    
    // This should not throw
    expect(() => {
      server.sendNotification('test-user-id', testData)
    }).not.toThrow()
  })

  test('should create realtime service', () => {
    service = new RealtimeService('ws://localhost:8081/ws', 'test-user')
    expect(service).toBeDefined()
    expect(service.isConnected()).toBe(false)
  })

  test('should handle venue updates subscription', () => {
    const callback = vi.fn()
    
    expect(() => {
      const unsubscribe = service.subscribeToVenueUpdates(callback)
      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    }).not.toThrow()
  })

  test('should handle vibe checks subscription', () => {
    const callback = vi.fn()
    const venueId = 'test-venue-id'
    
    expect(() => {
      const unsubscribe = service.subscribeToVibeChecks(venueId, callback)
      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    }).not.toThrow()
  })

  test('should handle promotions subscription', () => {
    const callback = vi.fn()
    const venueId = 'test-venue-id'
    
    expect(() => {
      const unsubscribe = service.subscribeToPromotions(venueId, callback)
      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    }).not.toThrow()
  })

  test('should handle notifications subscription', () => {
    const callback = vi.fn()
    
    expect(() => {
      const unsubscribe = service.subscribeToNotifications(callback)
      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    }).not.toThrow()
  })

  test('should get connection state', () => {
    const state = service.getConnectionState()
    expect(state).toHaveProperty('isConnected')
    expect(state).toHaveProperty('reconnectAttempts')
    expect(state).toHaveProperty('subscriptions')
  })
})

describe('Fallback Polling', () => {
  test('should create service with invalid URL', () => {
    // Mock fetch for polling
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    })

    const service = new RealtimeService('ws://invalid-url', 'test-user')
    
    // Just verify the service was created
    expect(service).toBeDefined()
    expect(service.isConnected()).toBe(false)
  })
})

describe('Channel Management', () => {
  test('should handle multiple subscriptions to same channel', () => {
    const service = new RealtimeService('ws://localhost:8081/ws', 'test-user')
    const callback1 = vi.fn()
    const callback2 = vi.fn()
    
    const unsubscribe1 = service.subscribeToVenueUpdates(callback1)
    const unsubscribe2 = service.subscribeToVenueUpdates(callback2)
    
    expect(typeof unsubscribe1).toBe('function')
    expect(typeof unsubscribe2).toBe('function')
    
    unsubscribe1()
    unsubscribe2()
  })

  test('should handle venue-specific subscriptions', () => {
    const service = new RealtimeService('ws://localhost:8081/ws', 'test-user')
    const callback = vi.fn()
    const venueId = 'test-venue-123'
    
    const unsubscribe = service.subscribeToVenueSpecific(venueId, callback)
    expect(typeof unsubscribe).toBe('function')
    
    unsubscribe()
  })
})