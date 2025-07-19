// Main dashboard page - will be implemented in UI components task
export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">Venues</h3>
          <p className="text-2xl font-bold">-</p>
          <p className="text-sm text-muted-foreground">Total venues managed</p>
        </div>
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">Promotions</h3>
          <p className="text-2xl font-bold">-</p>
          <p className="text-sm text-muted-foreground">Active promotions</p>
        </div>
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">Views</h3>
          <p className="text-2xl font-bold">-</p>
          <p className="text-sm text-muted-foreground">This week</p>
        </div>
        <div className="p-6 border rounded-lg">
          <h3 className="font-semibold mb-2">Vibe Checks</h3>
          <p className="text-2xl font-bold">-</p>
          <p className="text-sm text-muted-foreground">This week</p>
        </div>
      </div>
    </div>
  )
}