import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Download,
  Mail,
  RefreshCw,
  Trash2,
  Award,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  QrCode,
  ExternalLink,
} from 'lucide-react'
import { certificatesAPI } from '../api/endpoints'
import StatusBadge from '../components/StatusBadge'
import { useDownload } from '../hooks/useDownload'
import { formatDate, formatDateTime } from '../utils/formatters'

function TimelineItem({ icon: Icon, title, description, time, active = false }) {
  return (
    <div className={`flex gap-3 ${active ? 'opacity-100' : 'opacity-50'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${active ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
        <Icon size={14} />
      </div>
      <div className="flex-1 pb-5 border-b border-gray-100 dark:border-gray-800">
        <p className={`text-sm font-semibold ${active ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-600'}`}>{title}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{description}</p>}
        {time && <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">{formatDateTime(time)}</p>}
      </div>
    </div>
  )
}

export default function CertificateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { downloadBlob } = useDownload()

  const { data: cert, isLoading, error } = useQuery({
    queryKey: ['certificate', id],
    queryFn: () => certificatesAPI.get(id).then(r => r.data),
  })

  const downloadPDF = async () => {
    try {
      const res = await certificatesAPI.download(id)
      downloadBlob(res.data, `${cert?.candidate_name || id}_certificate.pdf`)
      toast.success('Download started')
    } catch {
      toast.error('Download failed')
    }
  }

  const sendEmail = useMutation({
    mutationFn: () => certificatesAPI.sendEmail(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['certificate', id])
      toast.success('Email sent!')
    },
    onError: () => toast.error('Failed to send email'),
  })

  const regenerate = useMutation({
    mutationFn: () => certificatesAPI.regenerate(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['certificate', id])
      toast.success('Certificate regenerated!')
    },
    onError: () => toast.error('Regeneration failed'),
  })

  const deleteCert = useMutation({
    mutationFn: () => certificatesAPI.delete(id),
    onSuccess: () => {
      toast.success('Certificate deleted')
      navigate('/certificates')
    },
    onError: () => toast.error('Delete failed'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  if (error || !cert) {
    return (
      <div className="max-w-2xl mx-auto card p-12 text-center">
        <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400">Certificate not found</p>
        <button onClick={() => navigate('/certificates')} className="btn-secondary mt-4 mx-auto">
          <ArrowLeft size={16} /> Back
        </button>
      </div>
    )
  }

  const verifyUrl = `${window.location.origin}/verify/${cert.certificate_id}`

  const timeline = [
    {
      icon: Award,
      title: 'Certificate Created',
      description: 'Certificate record created in system',
      time: cert.created_at,
      active: !!cert.created_at,
    },
    {
      icon: CheckCircle2,
      title: 'PDF Generated',
      description: 'Certificate PDF file generated successfully',
      time: cert.generated_at,
      active: cert.status === 'generated' || cert.status === 'emailed',
    },
    {
      icon: Mail,
      title: 'Email Sent',
      description: `Email delivered to ${cert.email}`,
      time: cert.email_sent_at,
      active: cert.email_sent || cert.status === 'emailed',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/certificates')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{cert.candidate_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs text-gray-400 dark:text-gray-600">{cert.certificate_id}</span>
              <StatusBadge status={cert.status} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={downloadPDF} className="btn-secondary text-sm">
            <Download size={15} /> Download PDF
          </button>
          <button onClick={() => sendEmail.mutate()} disabled={sendEmail.isPending} className="btn-primary text-sm">
            {sendEmail.isPending ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
            Send Email
          </button>
          <button onClick={() => regenerate.mutate()} disabled={regenerate.isPending} className="btn-secondary text-sm">
            {regenerate.isPending ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Regenerate
          </button>
          <button
            onClick={() => window.confirm('Delete this certificate?') && deleteCert.mutate()}
            className="btn-danger text-sm"
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Certificate info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <Award size={16} className="text-primary-600 dark:text-primary-400" />
              Certificate Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Recipient Name', value: cert.candidate_name },
                { label: 'Email', value: cert.email },
                { label: 'Course Name', value: cert.course_name },
                { label: 'Organization', value: cert.organization_name },
                { label: 'Issue Date', value: formatDate(cert.issue_date || cert.created_at) },
                { label: 'Event', value: cert.event_name },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-gray-400 dark:text-gray-600 mb-0.5">{item.label}</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.value || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* QR Code */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <QrCode size={16} className="text-primary-600 dark:text-primary-400" />
              Verification QR Code
            </h2>
            <div className="flex items-center gap-5">
              <div className="w-28 h-28 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center flex-shrink-0">
                {cert.qr_code_url ? (
                  <img src={cert.qr_code_url} alt="QR Code" className="w-24 h-24 object-contain" />
                ) : (
                  <QrCode size={48} className="text-gray-300 dark:text-gray-700" />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Scan this QR code to verify the certificate authenticity.
                </p>
                <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 font-mono text-xs text-gray-500 dark:text-gray-400 break-all">
                  {verifyUrl}
                </div>
                <a
                  href={verifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs py-1.5 inline-flex"
                >
                  <ExternalLink size={12} />
                  Open Verification Page
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-primary-600 dark:text-primary-400" />
            Status Timeline
          </h2>
          <div className="space-y-0">
            {timeline.map((item, i) => (
              <TimelineItem key={i} {...item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
