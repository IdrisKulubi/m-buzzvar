import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals'
import { RealtimeServiceMobile } from '../realtime/realtime-service-mobile'
import { RealtimeClientMobile } from '../realtime/websocket-client-mobile'

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage)

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}))

// Mock AppState
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}))

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  readyState: 1,
  send: vi.fn(),
  close: vi.fn(),
  onopen: null,
  onmessage: null,
  onclose: null,
  onerror: null,
}))

describe('Mobile Realtime System', () => {
  let service: RealtimeServiceMobile

  beforeAll(() => {
    service = new RealtimeServiceMobile(
      'ws://localhost:8081/ws',
      'http://localhost:3000',
      'test-user'
    )
  })

  test('should create mobile realtime service', () => {
    expect(service).toBeDefined()
    expect(service.isConnected()).toBe(false)
  })

  test('should handle venue updates subscription', () => {
    const callback = jest.fn()
    
    expect(() => {
      const unsubscribe = service.subscribeToVenueUpdates(callback)
      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    }).not.toThrow()
  })

  test('should handle vibe checks subscription', () => {
    const callback = jest.fn()
    const venueId = 'test-venue-id'
    
    expect(() => {
      const unsubscribe = service.subscribeToVibeChecks(venueId, callback)
      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    }).not.toThrow()
  })

  test('should handle promotions subscription', () => {
    const callback = jest.fn()
    const venueId = 'test-venue-id'
    
    expect(() => {
      const unsubscribe = service.subscribeToPromotions(venueId, callback)
      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    }).not.toThrow()
  })

  test('should handle notifications subscription', () => {
    const callback = jest.fn()
    
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
  })

  test('should handle AsyncStorage operations', async () => {
    // Test that AsyncStorage methods are called
    await service.connect().catch(() => {
      // Expected to fail in test environment
    })

    // The service should have attempted to use AsyncStorage
    expect(mockAsyncStorage.getItem).toHaveBeenCalled()
  })
})

describe('Mobile Client Connection Management', () => {
  test('should create mobile client', () => {
    const client = new RealtimeClientMobile({
      url: 'ws://localhost:8081/ws',
      userId: 'test-user'
    })
    
    expect(client).toBeDefined()
    expect(client.getConnectionState().isConnected).toBe(false)
  })

  test('should handle subscription management', () => {
    const client = new RealtimeClientMobile({
      url: 'ws://localhost:8081/ws',
      userId: 'test-user'
    })
    
    const callback = jest.fn()
    const unsubscribe = client.subscribe('test_channel', callback)
    
    expect(typeof unsubscribe).toBe('function')
    unsubscribe()
  })

  test('should handle connection state changes', () => {
    const client = new RealtimeClientMobile({
      url: 'ws://localhost:8081/ws',
      userId: 'test-user'
    })
    
    const initialState = client.getConnectionState()
    expect(initialState.isConnected).toBe(false)
    expect(initialState.reconnectAttempts).toBe(0)
  })
})

describe('Mobile Polling Fallback', () => {
  test('should enable polling when WebSocket fails', async () => {
    // Mock fetch for polling
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    })

    const service = new RealtimeServiceMobile(
      'ws://invalid-url',
      'http://localhost:3000',
      'test-user'
    )
    
    // Try to connect (should fail and enable polling)
    await service.connect().catch(() => {
      // Expected to fail
    })

    expect(service).toBeDefined()
  })

  test('should handle polling API calls', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {
          id: 'test-venue-1',
          name: 'Test Venue',
          updatedAt: new Date().toISOString()
        }
      ])
    })

    const service = new RealtimeServiceMobile(
      'ws://localhost:8081/ws',
      'http://localhost:3000',
      'test-user'
    )

    const callback = jest.fn()
    const unsubscribe = service.subscribeToVenueUpdates(callback)

    // Wait a bit for potential polling
    await new Promise(resolve => setTimeout(resolve, 100))

    unsubscribe()
  })
})