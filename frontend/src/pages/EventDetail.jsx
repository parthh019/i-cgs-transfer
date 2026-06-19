import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Upload,
  Play,
  Download,
  Mail,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Eye,
  Trash2,
  CalendarDays,
  Award,
  Send,
  FileSpreadsheet,
  Table2,
} from 'lucide-react'
import { eventsAPI, excelAPI, certificatesAPI } from '../api/endpoints'
import StatusBadge from '../components/StatusBadge'
import ProgressBar from '../components/ProgressBar'
import FileDropzone from '../components/FileDropzone'
import DataTable from '../components/DataTable'
import { useEventStatus } from '../hooks/useEventStatus'
import { useDownload } from '../hooks/useDownload'
import { formatDate, formatDateTime } from '../utils/formatters'

const TABS = [
  { id: 'upload', label: 'Upload Excel', icon: FileSpreadsheet },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'email', label: 'Email Status', icon: Mail },
]

function Tab1Upload({ eventId, onGenerate }) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploadErrors, setUploadErrors] = useState([])
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const uploadMutation = useMutation({
    mutationFn: (formData) => excelAPI.upload(eventId, formData),
    onSuccess: (res) => {
      setPreview(res.data)
      setUploadErrors(res.data.errors || [])
      setUploadSuccess(true)
      queryClient.invalidateQueries(['event', eventId])
      toast.success(`Excel uploaded: ${res.data.total_rows} participants found`)
    },
    onError: (err) => {
      setUploadErrors([err.response?.data?.detail || 'Upload failed'])
      toast.error('Failed to upload Excel file')
    },
  })

  const handleUpload = () => {
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    uploadMutation.mutate(fd)
  }

  const generateMutation = useMutation({
    mutationFn: () => excelAPI.generate(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries(['event', eventId])
      onGenerate()
      toast.success('Certificate generation started!')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to start generation'),
  })

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Upload Participant Excel</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Upload an Excel file (.xlsx) with participant data. Required columns:
          <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded ml-1">name, email</span>
          . Optional:
          <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded ml-1">course_name, organization</span>
        </p>
        <FileDropzone
          onFileSelect={setFile}
          selectedFile={file}
          onClear={() => { setFile(null); setPreview(null); setUploadErrors([]); setUploadSuccess(false) }}
          accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }}
          maxSize={20 * 1024 * 1024}
          label="Drop Excel file (.xlsx)"
          hint="Must contain columns: name, email"
        />
      </div>

      {/* Upload button */}
      {file && !uploadSuccess && (
        <div className="flex justify-end">
          <button
            onClick={handleUpload}
            disabled={uploadMutation.isPending}
            className="btn-primary"
          >
            {uploadMutation.isPending ? (
              <><Loader2 size={16} className="animate-spin" /> Uploading...</>
            ) : (
              <><Upload size={16} /> Upload & Validate</>
            )}
          </button>
        </div>
      )}

      {/* Errors */}
      {uploadErrors.length > 0 && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-2 mb-2 text-red-700 dark:text-red-400 font-semibold text-sm">
            <XCircle size={16} />
            Validation Errors ({uploadErrors.length})
          </div>
          <ul className="space-y-1">
            {uploadErrors.slice(0, 10).map((err, i) => (
              <li key={i} className="text-xs text-red-600 dark:text-red-400 font-mono">• {err}</li>
            ))}
            {uploadErrors.length > 10 && (
              <li className="text-xs text-red-500">...and {uploadErrors.length - 10} more errors</li>
            )}
          </ul>
        </div>
      )}

      {/* Preview table */}
      {preview && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <CheckCircle2 size={16} className="text-emerald-500" />
              Preview — {preview.total_rows} participants loaded
            </div>
            <span className="badge-green">{preview.valid_rows || preview.total_rows} valid</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {(preview.columns || ['name', 'email']).map((col) => (
                    <th key={col} className="table-header">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(preview.preview_rows || []).slice(0, 5).map((row, i) => (
                  <tr key={i} className="table-row">
                    {(preview.columns || ['name', 'email']).map((col) => (
                      <td key={col} className="table-cell">{row[col] ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.total_rows > 5 && (
            <p className="text-xs text-gray-400 mt-2 text-center">Showing first 5 of {preview.total_rows} rows</p>
          )}
        </div>
      )}

      {/* Generate button */}
      {uploadSuccess && uploadErrors.length === 0 && (
        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="btn-primary text-base px-6 py-3"
          >
            {generateMutation.isPending ? (
              <><Loader2 size={18} className="animate-spin" /> Starting Generation...</>
            ) : (
              <><Play size={18} /> Generate Certificates</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function Tab2Certificates({ eventId, status }) {
  const { downloadBlob } = useDownload()
  const queryClient = useQueryClient()

  const { data: certs = [], isLoading } = useQuery({
    queryKey: ['event-certificates', eventId],
    queryFn: () => certificatesAPI.list({ event_id: eventId }).then(r => r.data?.items || r.data || []),
    refetchInterval: status?.status === 'processing' ? 3000 : false,
  })

  const sendEmailsMutation = useMutation({
    mutationFn: () => eventsAPI.sendEmails(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries(['event-certificates', eventId])
      toast.success('Emails queued for sending!')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to send emails'),
  })

  const downloadZip = async () => {
    try {
      const res = await eventsAPI.downloadZip(eventId)
      downloadBlob(res.data, `certificates_event_${eventId}.zip`)
      toast.success('ZIP download started')
    } catch {
      toast.error('Failed to download ZIP')
    }
  }

  const sendSingle = async (certId) => {
    try {
      await certificatesAPI.sendEmail(certId)
      toast.success('Email sent!')
    } catch {
      toast.error('Failed to send email')
    }
  }

  const deleteCert = useMutation({
    mutationFn: (id) => certificatesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['event-certificates', eventId])
      toast.success('Certificate deleted')
    },
  })

  const isProcessing = status?.status === 'processing'
  const progress = status?.progress ?? 0
  const processed = status?.processed ?? 0
  const total = status?.total ?? 0

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => <span className="font-medium text-gray-800 dark:text-gray-200">{row.candidate_name || row.name || '—'}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => <span className="text-gray-600 dark:text-gray-400 text-xs">{row.email || '—'}</span>,
    },
    {
      key: 'cert_id',
      header: 'Cert ID',
      render: (row) => <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{row.certificate_id || row.cert_id || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => sendSingle(row.id)} className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500" title="Send Email">
            <Send size={13} />
          </button>
          <button onClick={() => window.open(`/verify/${row.certificate_id}`, '_blank')} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500" title="Verify">
            <Eye size={13} />
          </button>
          <button onClick={() => deleteCert.mutate(row.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* Progress bar while generating */}
      {(isProcessing || (progress > 0 && progress < 100)) && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold text-sm">
              <Loader2 size={16} className="animate-spin" />
              Generating certificates...
            </div>
            <span className="text-sm font-bold text-blue-700 dark:text-blue-400">{processed}/{total}</span>
          </div>
          <ProgressBar value={processed} max={total || 1} color="primary" size="md" />
        </div>
      )}

      {/* Actions */}
      {certs.length > 0 && !isProcessing && (
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={downloadZip} className="btn-secondary text-xs py-2">
            <Download size={14} />
            Download All (ZIP)
          </button>
          <button
            onClick={() => sendEmailsMutation.mutate()}
            disabled={sendEmailsMutation.isPending}
            className="btn-primary text-xs py-2"
          >
            {sendEmailsMutation.isPending ? (
              <><Loader2 size={14} className="animate-spin" /> Sending...</>
            ) : (
              <><Mail size={14} /> Send All Emails</>
            )}
          </button>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={certs}
        loading={isLoading}
        emptyMessage={isProcessing ? 'Generating...' : 'No certificates yet. Upload Excel and generate.'}
        emptyIcon={<Award size={40} className="text-gray-300 dark:text-gray-700 mx-auto" />}
      />
    </div>
  )
}

function Tab3EmailStatus({ eventId }) {
  const { data: emailStatus, isLoading } = useQuery({
    queryKey: ['event-email-status', eventId],
    queryFn: () => eventsAPI.getEmailStatus(eventId).then(r => r.data),
    refetchInterval: 10000,
  })

  const stats = [
    { label: 'Sent', value: emailStatus?.sent ?? 0, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Pending', value: emailStatus?.pending ?? 0, color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' },
    { label: 'Failed', value: emailStatus?.failed ?? 0, color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' },
  ]

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`card p-4 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{isLoading ? '—' : s.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Email status per cert */}
      {emailStatus?.details && emailStatus.details.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="table-header">Recipient</th>
                <th className="table-header">Email</th>
                <th className="table-header">Status</th>
                <th className="table-header">Sent At</th>
              </tr>
            </thead>
            <tbody>
              {emailStatus.details.map((row, i) => (
                <tr key={i} className="table-row">
                  <td className="table-cell font-medium">{row.name || '—'}</td>
                  <td className="table-cell text-xs text-gray-500">{row.email || '—'}</td>
                  <td className="table-cell"><StatusBadge status={row.email_status} /></td>
                  <td className="table-cell text-xs">{formatDateTime(row.email_sent_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('upload')
  const [polling, setPolling] = useState(false)

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsAPI.get(id).then(r => r.data),
  })

  const status = useEventStatus(id, polling)

  const handleGenerateStart = () => {
    setPolling(true)
    setActiveTab('certificates')
  }

  if (eventLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="card p-12 text-center">
        <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
        <p className="text-gray-600 dark:text-gray-400">Event not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/events')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{event.name}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <CalendarDays size={14} />
                {formatDate(event.event_date)}
              </div>
              <StatusBadge status={event.status} />
              {event.total_certificates > 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {event.total_certificates} certificates
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate(`/events/${id}/generate`)}
          className="btn-secondary text-sm"
        >
          <Eye size={15} />
          Preview & Generate
        </button>
      </div>

      {/* Event info card */}
      <div className="card p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Template</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{event.template_name || event.template?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Created</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{formatDate(event.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Total Certs</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{event.total_certificates ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Emails Sent</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{event.emails_sent ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-2 pt-2 gap-1">
          {TABS.map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all border-b-2 -mb-px ${
                activeTab === tabId
                  ? 'text-primary-600 dark:text-primary-400 border-primary-600 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'upload' && (
            <Tab1Upload eventId={id} onGenerate={handleGenerateStart} />
          )}
          {activeTab === 'certificates' && (
            <Tab2Certificates eventId={id} status={status} />
          )}
          {activeTab === 'email' && (
            <Tab3EmailStatus eventId={id} />
          )}
        </div>
      </div>
    </div>
  )
}
