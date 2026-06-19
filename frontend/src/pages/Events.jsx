import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Plus,
  Search,
  CalendarDays,
  Trash2,
  Eye,
  ChevronDown,
  AlertCircle,
} from 'lucide-react'
import { eventsAPI } from '../api/endpoints'
import StatusBadge from '../components/StatusBadge'
import DataTable from '../components/DataTable'
import { formatDate } from '../utils/formatters'

const STATUS_OPTIONS = ['all', 'pending', 'processing', 'completed', 'failed', 'draft']

export default function Events() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsAPI.list().then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => eventsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['events'])
      toast.success('Event deleted')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to delete event'),
  })

  const handleDelete = (id, name) => {
    if (window.confirm(`Delete event "${name}"? All associated certificates will also be deleted.`)) {
      deleteMutation.mutate(id)
    }
  }

  const filtered = events.filter((ev) => {
    const matchSearch = !search || ev.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || ev.status === statusFilter
    return matchSearch && matchStatus
  })

  const columns = [
    {
      key: 'name',
      header: 'Event Name',
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-800 dark:text-gray-200">{row.name}</p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">ID: {row.id}</p>
        </div>
      ),
    },
    {
      key: 'event_date',
      header: 'Date',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
          <CalendarDays size={14} />
          {formatDate(row.event_date)}
        </div>
      ),
    },
    {
      key: 'template',
      header: 'Template',
      render: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px] block">
          {row.template_name || row.template?.name || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'certificates',
      header: 'Certificates',
      render: (row) => (
        <span className="font-semibold text-gray-700 dark:text-gray-300">
          {row.total_certificates ?? 0}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/events/${row.id}`)}
            className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-600 dark:text-primary-400 transition-colors"
            title="View"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => handleDelete(row.id, row.name)}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Events</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage certificate generation events
          </p>
        </div>
        <button onClick={() => navigate('/events/new')} className="btn-primary">
          <Plus size={16} />
          New Event
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input pr-10 appearance-none cursor-pointer min-w-[160px]"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
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
          data={filtered}
          loading={isLoading}
          emptyMessage={search || statusFilter !== 'all' ? 'No events match your filters' : 'No events yet. Create your first event!'}
          emptyIcon={<CalendarDays size={40} className="text-gray-300 dark:text-gray-700 mx-auto" />}
        />
      </div>
    </div>
  )
}
