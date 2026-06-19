import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScrollText, Filter, RotateCcw, ShieldAlert, Info } from 'lucide-react'
import { dashboardAPI } from '../api/endpoints'
import DataTable from '../components/DataTable'
import { formatDateTime } from '../utils/formatters'

const ACTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'login', label: 'Login' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'generate_pdf', label: 'Generate PDF' },
  { value: 'bulk_email', label: 'Bulk Email' },
]

const RESOURCES = [
  { value: 'all', label: 'All Resources' },
  { value: 'admin', label: 'Admin' },
  { value: 'template', label: 'Template' },
  { value: 'event', label: 'Event' },
  { value: 'certificate', label: 'Certificate' },
]

export default function AuditLogs() {
  const [actionFilter, setActionFilter] = useState('all')
  const [resourceFilter, setResourceFilter] = useState('all')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', { action: actionFilter, resource: resourceFilter, page }],
    queryFn: () =>
      dashboardAPI.getAuditLogs({
        action: actionFilter !== 'all' ? actionFilter : undefined,
        resource: resourceFilter !== 'all' ? resourceFilter : undefined,
        page,
        page_size: PAGE_SIZE,
      }).then((r) => r.data),
    keepPreviousData: true,
  })

  const logs = data?.items || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  const handleReset = () => {
    setActionFilter('all')
    setResourceFilter('all')
    setPage(1)
  }

  const columns = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (row) => (
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          {formatDateTime(row.created_at)}
        </span>
      ),
    },
    {
      key: 'admin_name',
      header: 'Admin',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-[10px] font-bold">
            {row.admin_name?.[0]?.toUpperCase() || 'S'}
          </div>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {row.admin_name || 'System'}
          </span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => {
        const colors = {
          login: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          create: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
          update: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          delete: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
          generate_pdf: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
          bulk_email: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        }
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${colors[row.action] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
            {row.action}
          </span>
        )
      },
    },
    {
      key: 'resource',
      header: 'Resource',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
            {row.resource}
          </span>
          {row.resource_id && (
            <span className="text-[10px] text-gray-400 dark:text-gray-600 font-mono">
              ID: {row.resource_id}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      render: (row) => {
        if (!row.details) return <span className="text-gray-400 dark:text-gray-600">—</span>
        let detailsStr = ''
        try {
          detailsStr = typeof row.details === 'object' ? JSON.stringify(row.details) : String(row.details)
        } catch {
          detailsStr = String(row.details)
        }
        return (
          <div className="max-w-xs truncate text-xs text-gray-600 dark:text-gray-400 font-mono" title={detailsStr}>
            {detailsStr}
          </div>
        )
      },
    },
    {
      key: 'ip_address',
      header: 'IP Address',
      render: (row) => (
        <span className="text-xs text-gray-400 dark:text-gray-600 font-mono">
          {row.ip_address || '—'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-600">
            System Audit Logs
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track actions taken by system administrators.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Filter size={18} className="text-primary-500" />
            <span className="text-sm font-semibold">Filter:</span>
          </div>

          <div className="flex-1 min-w-[200px]">
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="input pr-10 appearance-none bg-no-repeat bg-[right_1rem_center]"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`, backgroundSize: '1.25rem' }}
            >
              {ACTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <select
              value={resourceFilter}
              onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
              className="input pr-10 appearance-none bg-no-repeat bg-[right_1rem_center]"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`, backgroundSize: '1.25rem' }}
            >
              {RESOURCES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleReset}
            disabled={actionFilter === 'all' && resourceFilter === 'all'}
            className="btn-secondary py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="card overflow-hidden">
        <DataTable
          columns={columns}
          data={logs}
          loading={isLoading}
          emptyMessage="No matching logs found"
          emptyIcon={<ShieldAlert className="w-12 h-12 text-gray-300 dark:text-gray-700" />}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
