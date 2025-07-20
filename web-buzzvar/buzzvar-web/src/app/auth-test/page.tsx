import AuthTest from '@/components/auth/AuthTest'

export default function AuthTestPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Better Auth Integration Test</h1>
        <AuthTest />
      </div>
    </div>
  )
}