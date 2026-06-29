import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Play,
  Download,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ImageOff,
  Zap,
} from 'lucide-react'
import { eventsAPI, excelAPI } from '../api/endpoints'
import ProgressBar from '../components/ProgressBar'
import StatusBadge from '../components/StatusBadge'
import { useEventStatus } from '../hooks/useEventStatus'
import { useDownload } from '../hooks/useDownload'
import { formatDate } from '../utils/formatters'

export default function EventGenerate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { downloadBlob } = useDownload()
  const [polling, setPolling] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewType, setPreviewType] = useState(null) // 'pdf' or 'image'
  const [previewLoading, setPreviewLoading] = useState(false)

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsAPI.get(id).then(r => r.data),
  })

  const status = useEventStatus(id, polling)

  const isProcessing = status?.status === 'processing' || polling
  const isCompleted = status?.status === 'completed'
  const isFailed = status?.status === 'failed'

  const loadPreview = async () => {
    setPreviewLoading(true)
    try {
      const res = await excelAPI.preview(id)
      const isPdfBlob = res.data.type === 'application/pdf'
      setPreviewType(isPdfBlob ? 'pdf' : 'image')
      const url = URL.createObjectURL(res.data)
      setPreviewUrl(url)
    } catch {
      // No preview available
    } finally {
      setPreviewLoading(false)
    }
  }

  const generateMutation = useMutation({
    mutationFn: () => excelAPI.generate(id),
    onSuccess: () => {
      setPolling(true)
      queryClient.invalidateQueries(['event', id])
      toast.success('Certificate generation started!')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to start generation'),
  })

  const sendEmailsMutation = useMutation({
    mutationFn: () => eventsAPI.sendEmails(id),
    onSuccess: () => {
      toast.success('Emails queued for sending!')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to send emails'),
  })

  const downloadZip = async () => {
    try {
      const res = await eventsAPI.downloadZip(id)
      downloadBlob(res.data, `certificates_${event?.name || id}.zip`)
      toast.success('Downloading ZIP...')
    } catch {
      toast.error('Failed to download ZIP')
    }
  }

  if (eventLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  const progress = status?.progress ?? 0
  const processed = status?.processed ?? 0
  const total = status?.total ?? 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/events/${id}`)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Preview & Generate</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{event?.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Certificate Preview */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Certificate Preview</h2>
            <button
              onClick={loadPreview}
              disabled={previewLoading}
              className="btn-secondary text-xs py-1.5"
            >
              {previewLoading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              Load Preview
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden min-h-[260px] flex items-center justify-center">
            {previewLoading ? (
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <Loader2 size={32} className="animate-spin" />
                <p className="text-sm">Generating preview...</p>
              </div>
            ) : previewUrl ? (
              previewType === 'pdf' ? (
                <iframe src={previewUrl} title="Certificate Preview" className="w-full h-[500px] border-0 rounded-xl" />
              ) : (
                <img src={previewUrl} alt="Certificate preview" className="w-full object-contain" />
              )
            ) : (
              <div className="flex flex-col items-center gap-3 text-gray-300 dark:text-gray-700 p-8 text-center">
                <ImageOff size={40} />
                <p className="text-sm">Click "Load Preview" to see how the certificate will look</p>
              </div>
            )}
          </div>
        </div>

        {/* Generation control */}
        <div className="space-y-4">
          {/* Event info */}
          <div className="card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Event Details</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Event', value: event?.name },
                { label: 'Date', value: formatDate(event?.event_date) },
                { label: 'Template', value: event?.template_name || event?.template?.name },
                { label: 'Participants', value: event?.total_certificates ?? 'Upload Excel first' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-gray-400 dark:text-gray-600">{item.label}</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{item.value || '—'}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">Status:</span>
              <StatusBadge status={event?.status} />
            </div>
          </div>

          {/* Progress */}
          {(isProcessing || isCompleted) && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Generation Progress</h2>
                {isCompleted && <CheckCircle2 size={18} className="text-emerald-500" />}
              </div>
              <ProgressBar
                value={isCompleted ? 100 : processed}
                max={total || 100}
                color={isCompleted ? 'green' : 'gradient'}
                size="lg"
                label={isCompleted ? 'Completed!' : `${processed} / ${total} certificates`}
              />
              {isFailed && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle size={16} />
                  Generation failed. Please try again.
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="card p-4 space-y-3">
            {!isProcessing && !isCompleted && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
                ⚡ Make sure you've uploaded the Excel file before generating. This will create one certificate per participant.
              </div>
            )}

            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || isProcessing}
              className="w-full btn-primary justify-center py-3 text-base"
            >
              {generateMutation.isPending || isProcessing ? (
                <><Loader2 size={18} className="animate-spin" /> Generating...</>
              ) : isCompleted ? (
                <><Zap size={18} /> Re-Generate All</>
              ) : (
                <><Zap size={18} /> Generate All Certificates</>
              )}
            </button>

            {isCompleted && (
              <>
                <button onClick={downloadZip} className="w-full btn-secondary justify-center py-2.5">
                  <Download size={16} />
                  Download All as ZIP
                </button>
                <button
                  onClick={() => sendEmailsMutation.mutate()}
                  disabled={sendEmailsMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors"
                >
                  {sendEmailsMutation.isPending ? (
                    <><Loader2 size={16} className="animate-spin" /> Sending...</>
                  ) : (
                    <><Mail size={16} /> Send All via Email</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
