import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from './Layout'

export default function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary-200 dark:border-primary-900 animate-spin border-t-primary-600" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading CertifyPro...</p>
        </div>
      </div>
    )
  }

  if (!admin) return <Navigate to="/login" replace />

  return <Layout>{children}</Layout>
}
