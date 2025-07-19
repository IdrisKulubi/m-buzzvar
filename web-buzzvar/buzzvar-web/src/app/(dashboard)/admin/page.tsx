import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div>
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Total Users</h3>
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Will be implemented in analytics task</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Total Venues</h3>
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Will be implemented in analytics task</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Active Promotions</h3>
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Will be implemented in analytics task</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">Vibe Checks</h3>
            <p className="text-2xl font-bold">-</p>
            <p className="text-sm text-muted-foreground">Will be implemented in analytics task</p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}