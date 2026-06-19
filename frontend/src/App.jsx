import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import Verification from './pages/Verification'
import Dashboard from './pages/Dashboard'
import Templates from './pages/Templates'
import TemplateNew from './pages/TemplateNew'
import TemplateEdit from './pages/TemplateEdit'
import EmailSettings from './pages/EmailSettings'


function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-600">
        404
      </div>
      <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">Page not found</p>
      <p className="text-gray-500 dark:text-gray-400">The page you're looking for doesn't exist.</p>
      <a href="/dashboard" className="btn-primary mt-2">Go to Dashboard</a>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/verify/:certId" element={<Verification />} />
          <Route path="/verify" element={<Verification />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
          />
          <Route
            path="/templates"
            element={<ProtectedRoute><Templates /></ProtectedRoute>}
          />
          <Route
            path="/templates/new"
            element={<ProtectedRoute><TemplateNew /></ProtectedRoute>}
          />
          <Route
            path="/templates/:id/edit"
            element={<ProtectedRoute><TemplateEdit /></ProtectedRoute>}
          />
          <Route
            path="/settings"
            element={<ProtectedRoute><EmailSettings /></ProtectedRoute>}
          />


          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}
