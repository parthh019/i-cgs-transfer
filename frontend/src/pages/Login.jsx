import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@company.com')
  const [password, setPassword] = useState('admin123')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text)] transition-colors duration-200">
      {/* Login card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-slide-up">
        <div className="card p-8 bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-md)]">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded bg-[var(--primary)] flex items-center justify-center shadow-sm mb-4">
              <Shield size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text)]">CertifyPro</h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">Certificate Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 p-3 rounded bg-[var(--danger-soft)] border border-[var(--danger)] text-[var(--danger)] text-sm">
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  required
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input pl-10 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 py-3"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Default credentials hint */}
          <div className="mt-6 p-4 rounded bg-[var(--surface-muted)] border border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)] text-center font-medium mb-1.5">Demo Credentials</p>
            <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-muted)] font-mono">
              <span>admin@company.com</span>
              <span className="text-[var(--border-strong)]">•</span>
              <span>admin123</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          © 2025 CertifyPro. All rights reserved.
        </p>
      </div>
    </div>
  )
}
