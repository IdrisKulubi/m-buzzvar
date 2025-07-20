import { RealtimeDemo } from '@/components/realtime/RealtimeDemo'

export default function RealtimeDemoPage() {
  const wsUrl = process.env.NODE_ENV === 'production' 
    ? 'wss://your-domain.com/ws' 
    : 'ws://localhost:8080/ws'

  return (
    <div className="min-h-screen bg-gray-50">
      <RealtimeDemo 
        wsUrl={wsUrl}
        userId="demo-user-123"
        venueId="demo-venue-456"
      />
    </div>
  )
}