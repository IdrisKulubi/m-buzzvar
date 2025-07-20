# Real-time Updates System Documentation

## Overview

The real-time updates system provides live data synchronization between the web admin portal and mobile app without relying on Supabase Realtime. It uses WebSocket connections with automatic fallback to polling for reliable real-time updates.

## Architecture

### Components

1. **WebSocket Server** (`websocket-server.ts`)
   - Handles WebSocket connections
   - Manages client subscriptions to channels
   - Broadcasts updates to subscribed clients
   - Implements ping/pong heartbeat for connection health

2. **WebSocket Clients**
   - **Web Client** (`websocket-client-web.ts`) - Browser WebSocket client
   - **Mobile Client** (`websocket-client-mobile.ts`) - React Native WebSocket client with app state handling

3. **Realtime Services**
   - **Web Service** (`realtime-service.ts`) - High-level service for web app
   - **Mobile Service** (`realtime-service-mobile.ts`) - High-level service for mobile app
   - Both include automatic fallback to HTTP polling

4. **React Hooks** (`hooks.ts`)
   - Easy-to-use React hooks for subscribing to real-time updates
   - Automatic cleanup and connection management

5. **API Endpoints**
   - Polling fallback endpoints for when WebSocket is unavailable
   - WebSocket control endpoints for broadcasting and notifications

## Features

### Channel-based Subscriptions

- **Venue Updates**: `venue_updates` (all venues) or `venue:{venueId}` (specific venue)
- **Vibe Checks**: `vibe_checks:{venueId}` (venue-specific vibe checks)
- **Promotions**: `promotions:{venueId}` (venue-specific promotions)
- **Notifications**: Direct user notifications (not channel-based)

### Automatic Fallback Polling

When WebSocket connection fails or is unreliable:
- Automatically switches to HTTP polling
- Configurable polling interval (default: 30 seconds)
- Tracks last update timestamps to avoid duplicate data
- Switches back to WebSocket when connection is restored

### Connection Management

- Automatic reconnection with exponential backoff
- Heartbeat/ping-pong for connection health monitoring
- App state awareness on mobile (pause/resume handling)
- Network state monitoring

## Usage

### Web Application

```typescript
import { useRealtime, useVenueUpdates, useVibeChecks } from '@/lib/realtime/hooks'

function VenueManagement({ venueId }: { venueId: string }) {
  const { service, isConnected } = useRealtime('ws://localhost:8080/ws', 'user-123')
  
  // Subscribe to venue-specific updates
  useVenueUpdates(service, (update) => {
    console.log('Venue updated:', update)
    // Update your UI state
  })
  
  // Subscribe to vibe checks for this venue
  useVibeChecks(service, venueId, (vibeCheck) => {
    console.log('New vibe check:', vibeCheck)
    // Update vibe check list
  })
  
  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {/* Your venue management UI */}
    </div>
  )
}
```

### Mobile Application

```typescript
import { useRealtime, useVenueUpdates, useNotifications } from '../lib/realtime/hooks'

function VenueScreen({ venueId }: { venueId: string }) {
  const { service, isConnected } = useRealtime(
    'ws://localhost:8080/ws',
    'http://localhost:3000',
    'user-123'
  )
  
  // Subscribe to venue updates
  useVenueUpdates(service, (update) => {
    // Update venue data in your state
  })
  
  // Subscribe to notifications
  useNotifications(service, (notification) => {
    // Show notification to user
    Alert.alert(notification.title, notification.message)
  })
  
  return (
    <View>
      <Text>Status: {isConnected ? 'Connected' : 'Disconnected'}</Text>
      {/* Your venue UI */}
    </View>
  )
}
```

### Broadcasting Updates

From your API routes or services, broadcast updates to connected clients:

```typescript
// In your API route or service
import { getRealtimeServer } from '@/lib/realtime/websocket-server'

// Broadcast venue update to all subscribers
const server = getRealtimeServer()
server.broadcastToChannel('venue_updates', {
  id: venue.id,
  name: venue.name,
  description: venue.description,
  status: venue.isActive ? 'active' : 'inactive',
  updatedAt: venue.updatedAt.toISOString(),
  updatedBy: userId
})

// Send notification to specific user
server.sendNotification(userId, {
  id: crypto.randomUUID(),
  type: 'venue_update',
  title: 'Venue Updated',
  message: `${venue.name} has been updated`,
  data: { venueId: venue.id },
  createdAt: new Date().toISOString()
})
```

## Configuration

### Environment Variables

```env
# WebSocket server port
WEBSOCKET_PORT=8080

# API base URL for mobile polling fallback
NEXT_PUBLIC_API_URL=http://localhost:3000

# WebSocket URL for clients
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
```

### Server Configuration

```typescript
// Start WebSocket server
import { getRealtimeServer } from '@/lib/realtime/websocket-server'

const server = getRealtimeServer(8080)
console.log('WebSocket server started on port 8080')
```

## API Endpoints

### Polling Fallback Endpoints

- `GET /api/venues/updates?since={timestamp}` - Get venue updates since timestamp
- `GET /api/venues/{venueId}/updates?since={timestamp}` - Get specific venue updates
- `GET /api/venues/{venueId}/vibe-checks?since={timestamp}` - Get vibe checks since timestamp
- `GET /api/venues/{venueId}/promotions?since={timestamp}` - Get promotions since timestamp
- `GET /api/notifications?since={timestamp}` - Get notifications since timestamp

### WebSocket Control Endpoints

- `GET /api/websocket` - Get WebSocket server status
- `POST /api/websocket` - Send broadcasts or notifications

```typescript
// Broadcast to channel
POST /api/websocket
{
  "action": "broadcast",
  "channel": "venue_updates",
  "data": { /* update data */ }
}

// Send notification to user
POST /api/websocket
{
  "action": "notify",
  "userId": "user-123",
  "data": { /* notification data */ }
}
```

## Testing

### Running Tests

```bash
# Web app tests
cd apps/web-buzzvar/buzzvar-web
npm test -- --run realtime

# Mobile app tests
cd apps/m-buzzvar
npm test -- --testPathPattern=realtime
```

### Demo Pages

- Web: Visit `/realtime-demo` to see the real-time system in action
- Mobile: Use the `RealtimeDemo` component in your app

### Manual Testing

1. Start the WebSocket server
2. Open multiple browser tabs or mobile app instances
3. Trigger updates from one client
4. Verify updates appear in real-time on other clients
5. Test connection loss/recovery scenarios

## Troubleshooting

### Common Issues

1. **WebSocket Connection Fails**
   - Check if WebSocket server is running on correct port
   - Verify firewall settings allow WebSocket connections
   - Check browser console for connection errors

2. **Polling Fallback Not Working**
   - Verify API endpoints are accessible
   - Check network connectivity
   - Ensure proper CORS configuration

3. **Mobile App State Issues**
   - Verify app state listeners are properly set up
   - Check if WebSocket reconnects when app becomes active
   - Test background/foreground transitions

4. **Memory Leaks**
   - Ensure proper cleanup of subscriptions
   - Check that event listeners are removed
   - Monitor connection counts on server

### Debugging

Enable debug logging:

```typescript
// Add to your environment
DEBUG=websocket:*

// Or in code
console.log('WebSocket state:', client.getConnectionState())
console.log('Server stats:', server.getStats())
```

## Performance Considerations

### Connection Limits

- WebSocket server can handle thousands of concurrent connections
- Monitor memory usage and connection counts
- Implement connection limits if needed

### Bandwidth Optimization

- Only subscribe to channels you need
- Unsubscribe when components unmount
- Consider message batching for high-frequency updates

### Mobile Considerations

- Respect device battery life with appropriate polling intervals
- Handle network changes gracefully
- Pause unnecessary updates when app is backgrounded

## Security

### Authentication

- Implement proper user authentication before allowing WebSocket connections
- Validate user permissions for channel subscriptions
- Use secure WebSocket (WSS) in production

### Rate Limiting

- Implement rate limiting on WebSocket messages
- Limit subscription counts per user
- Monitor for abuse patterns

### Data Validation

- Validate all incoming WebSocket messages
- Sanitize data before broadcasting
- Implement proper error handling

## Deployment

### Production Setup

1. Use WSS (secure WebSocket) in production
2. Set up proper load balancing for WebSocket connections
3. Configure monitoring and alerting
4. Set up proper logging and error tracking

### Scaling

- Consider using Redis for multi-server WebSocket scaling
- Implement horizontal scaling with sticky sessions
- Monitor connection distribution across servers

This real-time system provides a robust foundation for live updates in your application while maintaining reliability through automatic fallback mechanisms.