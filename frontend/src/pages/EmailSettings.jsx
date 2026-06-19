import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Server, CheckCircle2, XCircle, Info, Settings, HelpCircle, Loader2 } from 'lucide-react'
import { emailAPI } from '../api/endpoints'

export default function EmailSettings() {
  const [smtpConfig, setSmtpConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [useMock, setUseMock] = useState(localStorage.getItem('use_mock_db') !== 'false')

  useEffect(() => {
    fetchSmtpConfig()
  }, [useMock])

  const fetchSmtpConfig = async () => {
    setLoading(true)
    try {
      const res = await emailAPI.getConfig()
      setSmtpConfig(res.data)
    } catch (err) {
      console.error(err)
      setSmtpConfig(null)
      if (!useMock) {
        toast.error('Could not connect to backend server. Make sure your FastAPI backend is running on http://localhost:8000.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleToggleMock = (val) => {
    setUseMock(val)
    localStorage.setItem('use_mock_db', String(val))
    toast.success(val ? 'Switched to browser simulation mode.' : 'Switched to Live API connection mode.')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Account connection card */}
        <div className="md:col-span-2 space-y-6">
          <div className="card p-6 space-y-5">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-[var(--border)] pb-3">
              <Server className="text-[var(--primary)]" size={18} />
              System Connection Settings
            </h3>

            {/* Mode selection toggles */}
            <div className="flex bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => handleToggleMock(true)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                  useMock
                    ? 'bg-white dark:bg-gray-700 shadow text-primary-500'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Mock Mode (Browser Sandbox)
              </button>
              <button
                type="button"
                onClick={() => handleToggleMock(false)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                  !useMock
                    ? 'bg-white dark:bg-gray-700 shadow text-primary-500'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Live SMTP Mode (Real Emails)
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
                <p className="text-xs text-[var(--text-muted)]">Loading SMTP settings...</p>
              </div>
            ) : smtpConfig ? (
              <div className="space-y-5">
                {/* Status Header */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  smtpConfig.email_enabled 
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400' 
                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-400'
                }`}>
                  {smtpConfig.email_enabled ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
                  )}
                  <div className="text-xs">
                    <h4 className="font-bold">
                      SMTP Service Status: {smtpConfig.email_enabled ? 'Operational / Enabled' : 'Disabled'}
                    </h4>
                    <p className="opacity-90 mt-0.5">
                      {smtpConfig.email_enabled 
                        ? 'The backend Python service is fully configured to send certificate emails automatically.' 
                        : 'Email sending is currently disabled in your backend configuration. Set EMAIL_ENABLED=True in .env to enable.'}
                    </p>
                  </div>
                </div>

                {/* Configuration Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-[var(--border)] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400">SMTP Host Server</span>
                    <p className="text-sm font-mono text-gray-700 dark:text-gray-300">{smtpConfig.smtp_host || 'Not Configured'}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-[var(--border)] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400">SMTP Port</span>
                    <p className="text-sm font-mono text-gray-700 dark:text-gray-300">{smtpConfig.smtp_port || 'Not Configured'}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-[var(--border)] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Sender Address (User)</span>
                    <p className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate">{smtpConfig.smtp_user || 'Not Configured'}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-[var(--border)] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Sender Display Name</span>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">{smtpConfig.email_from_name || 'Not Configured'}</p>
                  </div>
                </div>

                {/* Info Note */}
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 flex gap-3 text-xs leading-relaxed text-[var(--text-muted)]">
                  <Info className="text-[var(--primary)] w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-gray-200">How to Edit Credentials</h4>
                    <p className="mt-0.5">
                      The SMTP credentials shown above are loaded directly from the backend server's `.env` configuration file. To update your password, server settings, or credentials, please edit the `.env` file and restart the backend.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                <XCircle className="w-12 h-12 text-rose-500" />
                <div className="text-xs max-w-md space-y-2">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Failed to Connect to API Server</h4>
                  <p className="text-[var(--text-muted)]">
                    The frontend application is attempting to connect to the backend server at <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-gray-600 dark:text-gray-400">http://localhost:8000</code>.
                  </p>
                  <p className="text-rose-500 font-semibold">
                    Please ensure that your FastAPI Python server is running.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Setup Guide */}
        <div className="md:col-span-1">
          <div className="card p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-[var(--border)] pb-3">
              <HelpCircle className="text-[var(--primary)]" size={16} />
              SMTP Setup Guide
            </h3>

            <div className="space-y-3.5 text-xs text-[var(--text-muted)] leading-relaxed">
              <p>For Gmail, we strongly recommend using Google **App Passwords** to prevent authentication blocks.</p>
              
              <ol className="list-decimal pl-4 space-y-2.5">
                <li>Enable **2-Step Verification** on your Google Account settings.</li>
                <li>Go to **Security &gt; App Passwords** and generate a new 16-character code for your app.</li>
                <li>Paste the 16-character code into the `SMTP_PASSWORD` field inside your backend `.env` file.</li>
                <li>Restart the server to apply changes.</li>
              </ol>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
