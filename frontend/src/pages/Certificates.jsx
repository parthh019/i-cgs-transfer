import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Search,
  Award,
  Download,
  Mail,
  RefreshCw,
  Trash2,
  Eye,
  ChevronDown,
  Filter,
} from 'lucide-react'
import { certificatesAPI, eventsAPI } from '../api/endpoints'
import StatusBadge from '../components/StatusBadge'
import DataTable from '../components/DataTable'
import { useDownload } from '../hooks/useDownload'
import { formatDate, truncate } from '../utils/formatters'

export default function Certificates() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { downloadBlob } = useDownload()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [eventFilter, setEventFilter] = useState('all')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const { data: events = [] } = useQuery({
    queryKey: ['events-list'],
    queryFn: () => eventsAPI.list().then(r => r.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['certificates', { search, status: statusFilter, event: eventFilter, page }],
    queryFn: () =>
      certificatesAPI.list({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        event_id: eventFilter !== 'all' ? eventFilter : undefined,
        page,
        page_size: PAGE_SIZE,
      }).then(r => r.data),
    keepPreviousData: true,
  })

  const certs = data?.items || data || []
  const totalPages = data?.total_pages || Math.ceil((data?.total || certs.length) / PAGE_SIZE) || 1

  const downloadCert = async (cert) => {
    try {
      const res = await certificatesAPI.download(cert.id)
      downloadBlob(res.data, `${cert.candidate_name || cert.certificate_id}_certificate.pdf`)
      toast.success('Download started')
    } catch {
      toast.error('Download failed')
    }
  }

  const sendEmail = useMutation({
    mutationFn: (id) => certificatesAPI.sendEmail(id),
    onSuccess: () => toast.success('Email sent!'),
    onError: () => toast.error('Failed to send email'),
  })

  const regenerate = useMutation({
    mutationFn: (id) => certificatesAPI.regenerate(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['certificates'])
      toast.success('Certificate regenerated!')
    },
    onError: () => toast.error('Regeneration failed'),
  })

  const deleteCert = useMutation({
    mutationFn: (id) => certificatesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['certificates'])
      toast.success('Certificate deleted')
    },
    onError: () => toast.error('Delete failed'),
  })

  const handleDelete = (id, name) => {
    if (window.confirm(`Delete certificate for ${name}?`)) deleteCert.mutate(id)
  }

  const columns = [
    {
      key: 'cert_id',
      header: 'Cert ID',
      render: (row) => (
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
          {truncate(row.certificate_id || row.cert_id || '—', 20)}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <button
          onClick={() => navigate(`/certificates/${row.id}`)}
          className="font-semibold text-gray-800 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 text-left"
        >
          {row.candidate_name || row.name || '—'}
        </button>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => <span className="text-xs text-gray-500 dark:text-gray-400">{row.email || '—'}</span>,
    },
    {
      key: 'course',
      header: 'Course',
      render: (row) => <span className="text-sm">{truncate(row.course_name || '—', 25)}</span>,
    },
    {
      key: 'issue_date',
      header: 'Issue Date',
      render: (row) => <span className="text-sm">{formatDate(row.issue_date || row.created_at)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'email_status',
      header: 'Email',
      render: (row) => (
        <span className={`text-xs font-medium ${row.email_sent ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
          {row.email_sent ? '✓ Sent' : 'Not sent'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(`/certificates/${row.id}`)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500" title="View">
            <Eye size={13} />
          </button>
          <button onClick={() => downloadCert(row)} className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500" title="Download PDF">
            <Download size={13} />
          </button>
          <button onClick={() => sendEmail.mutate(row.id)} className="p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500" title="Send Email">
            <Mail size={13} />
          </button>
          <button onClick={() => regenerate.mutate(row.id)} className="p-1 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-500" title="Regenerate">
            <RefreshCw size={13} />
          </button>
          <button onClick={() => handleDelete(row.id, row.candidate_name)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Certificates</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Browse and manage all generated certificates
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or cert ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="input pl-9"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="input pr-9 appearance-none cursor-pointer min-w-[150px]"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="generated">Generated</option>
              <option value="emailed">Emailed</option>
              <option value="failed">Failed</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={eventFilter}
              onChange={(e) => { setEventFilter(e.target.value); setPage(1) }}
              className="input pr-9 appearance-none cursor-pointer min-w-[160px]"
            >
              <option value="all">All Events</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{truncate(ev.name, 30)}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <DataTable
          columns={columns}
          data={certs}
          loading={isLoading}
          emptyMessage="No certificates found"
          emptyIcon={<Award size={40} className="text-gray-300 dark:text-gray-700 mx-auto" />}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
