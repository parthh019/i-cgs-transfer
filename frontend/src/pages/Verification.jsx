import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Shield, ShieldCheck, ShieldAlert, Search, ArrowRight, Loader2, Calendar, Award, User, Bookmark } from 'lucide-react'
import { certificatesAPI } from '../api/endpoints'
import { formatDate } from '../utils/formatters'
import { useTheme } from '../contexts/ThemeContext'

export default function Verification() {
  const { certId: urlCertId } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const [inputId, setInputId] = useState('')
  const [activeCertId, setActiveCertId] = useState(urlCertId || '')

  useEffect(() => {
    if (urlCertId) {
      setActiveCertId(urlCertId)
      setInputId(urlCertId)
    }
  }, [urlCertId])

  const { data: result, isLoading, isError, error } = useQuery({
    queryKey: ['verify', activeCertId],
    queryFn: () => certificatesAPI.verify(activeCertId).then((r) => r.data),
    enabled: !!activeCertId,
    retry: false,
  })

  const handleSearch = (e) => {
    e.preventDefault()
    if (inputId.trim()) {
      setActiveCertId(inputId.trim())
      navigate(`/verify/${encodeURIComponent(inputId.trim())}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 flex flex-col items-center justify-center relative overflow-hidden p-4">
      {/* Background visual shapes */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/15 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent-600/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-xl flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-3 text-center mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center shadow-xl shadow-primary-500/10">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              CertifyPro Verification
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Secure Digital Certificate Verification Portal
            </p>
          </div>
        </div>

        {/* Input box */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSearch} className="space-y-4">
            <label className="block text-sm font-semibold text-gray-300">
              Verify Certificate ID
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. CERT-20260617-A1B2C3"
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-4 pr-12 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder-gray-600"
              />
              <button
                type="submit"
                className="absolute right-2.5 top-2.5 p-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors"
              >
                <Search size={16} />
              </button>
            </div>
          </form>

          {/* Quick info if empty */}
          {!activeCertId && (
            <div className="mt-4 flex gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-500 leading-relaxed">
              <Info size={16} className="text-primary-400 flex-shrink-0" />
              <p>
                To verify, enter the Certificate ID printed on the document or scan its QR code to be routed here directly.
              </p>
            </div>
          )}
        </div>

        {/* Result Box */}
        {activeCertId && (
          <div className="animate-slide-up">
            {isLoading ? (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 text-center">
                <Loader2 size={36} className="animate-spin text-primary-500" />
                <p className="text-sm text-gray-400 font-medium">Looking up record...</p>
              </div>
            ) : result && result.valid ? (
              /* Success Certificate Details Card */
              <div className="bg-white/5 backdrop-blur-xl border border-emerald-500/20 rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/5">
                {/* Header Badge */}
                <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-400">Verified Authentic</p>
                    <p className="text-[10px] text-emerald-500/80 font-mono -mt-0.5">ID: {result.certificate_id}</p>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-6 space-y-4">
                  <div className="flex gap-4 items-start pb-4 border-b border-white/5">
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-primary-400 flex-shrink-0">
                      <User size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Attendee Name</p>
                      <p className="text-base font-bold text-white mt-0.5">{result.attendee_name}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start pb-4 border-b border-white/5">
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-primary-400 flex-shrink-0">
                      <Award size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Course / Program</p>
                      <p className="text-sm font-bold text-white mt-0.5">{result.course_name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex gap-3 items-start">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-primary-400 flex-shrink-0">
                        <Calendar size={16} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Issue Date</p>
                        <p className="text-xs font-semibold text-white mt-0.5">{formatDate(result.issue_date)}</p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-primary-400 flex-shrink-0">
                        <Bookmark size={16} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Event</p>
                        <p className="text-xs font-semibold text-white mt-0.5">{result.event_name || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Invalid/Failed Card */
              <div className="bg-white/5 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 flex flex-col items-center gap-4 text-center shadow-2xl shadow-red-500/5">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                  <ShieldAlert size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Invalid Certificate ID</h3>
                  <p className="text-sm text-gray-400 mt-1.5 leading-relaxed max-w-sm">
                    {result?.message || 'The provided certificate ID could not be found or has not been generated.'}
                  </p>
                </div>
                <div className="w-full border-t border-white/5 pt-4 text-xs text-gray-600 font-mono">
                  Checked ID: {activeCertId}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-[10px] text-gray-700 dark:text-gray-600 flex items-center justify-center gap-1.5 mt-4">
          <Shield size={12} />
          <span>CertifyPro secure verification. End-to-end cryptographic proof.</span>
        </div>
      </div>
    </div>
  )
}
