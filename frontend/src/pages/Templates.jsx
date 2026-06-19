import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Image, Edit2, Trash2, Eye, Calendar, Layers, AlertCircle } from 'lucide-react'
import { templatesAPI } from '../api/endpoints'
import { formatDate } from '../utils/formatters'

function TemplateCard({ template, onDelete, selected, onToggleSelect }) {
  const navigate = useNavigate()
  const [imgError, setImgError] = useState(false)
  const fileUrl = templatesAPI.getFileUrl(template.id)

  return (
    <div className={`card group hover:shadow-lg transition-all duration-200 overflow-hidden relative border-2 ${
      selected ? 'border-[var(--primary)] shadow-md' : 'border-[var(--border)]'
    }`}>
      {/* Selection Checkbox */}
      <div className="absolute top-3 left-3 z-10 bg-[var(--surface)] p-1 rounded border border-[var(--border)] shadow-sm flex items-center justify-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(template.id)}
          className="w-4.5 h-4.5 text-[var(--primary)] bg-[var(--input-bg)] border-[var(--input-border)] rounded-[var(--radius-sm)] focus:ring-[var(--primary)] cursor-pointer accent-[var(--primary)]"
        />
      </div>

      {/* Thumbnail */}
      <div className="relative h-44 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 overflow-hidden">
        {!imgError ? (
          <img
            src={fileUrl}
            alt={template.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 dark:text-gray-700">
            <Image size={48} className="mb-2 opacity-40" />
            <p className="text-xs opacity-60">No preview</p>
          </div>
        )}
        {/* Hover actions overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
          <button
            onClick={() => window.open(fileUrl, '_blank')}
            className="p-2 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--row-hover)] transition-colors"
            title="View"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => navigate(`/templates/${template.id}/edit`)}
            className="p-2 rounded bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--row-hover)] transition-colors"
            title="Edit Config"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onDelete(template.id)}
            className="p-2 rounded bg-[var(--danger-soft)] border border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 truncate mb-2">{template.name}</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Calendar size={12} />
            <span>{formatDate(template.created_at)}</span>
          </div>
          {template.placeholder_config && (
            <div className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 font-medium">
              <Layers size={11} />
              <span>
                {Object.values(template.placeholder_config).filter(f => f?.enabled !== false).length} fields
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Templates() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState([])

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesAPI.list().then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => templatesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['templates'])
    },
  })

  const handleDelete = (id) => {
    if (window.confirm('Delete this template? This action cannot be undone.')) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success('Template deleted successfully')
          setSelectedIds(prev => prev.filter(x => x !== id))
        },
        onError: (err) => toast.error(err.response?.data?.detail || 'Failed to delete template'),
      })
    }
  }

  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedIds.length === templates.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(templates.map(t => t.id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (window.confirm(`Delete ${selectedIds.length} template(s)? This action cannot be undone.`)) {
      const loadingToast = toast.loading(`Deleting ${selectedIds.length} templates...`)
      try {
        await Promise.all(selectedIds.map(id => deleteMutation.mutateAsync(id)))
        toast.success('Templates deleted successfully', { id: loadingToast })
        setSelectedIds([])
      } catch (err) {
        toast.error('Failed to delete some templates', { id: loadingToast })
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Actions Bar (matching reference) */}
      <div className="card p-4 flex flex-row items-center justify-between gap-4 bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-sm)] flex-wrap">
        <div className="flex items-center gap-3">
          {templates.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="btn-secondary py-2 px-3 text-xs"
            >
              {selectedIds.length === templates.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="btn-danger py-2 px-3 text-xs flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>

        <button onClick={() => navigate('/templates/new')} className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5">
          <Plus size={14} />
          Upload Template
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded bg-[var(--danger-soft)] border border-[var(--danger)] text-[var(--danger)]">
          <AlertCircle size={18} />
          <span className="text-sm">Failed to load templates. Please try again.</span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="h-44 bg-gray-200 dark:bg-gray-800 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Templates grid */}
      {!isLoading && templates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map((template, i) => (
            <div key={template.id} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <TemplateCard
                template={template}
                onDelete={handleDelete}
                selected={selectedIds.includes(template.id)}
                onToggleSelect={handleToggleSelect}
              />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && templates.length === 0 && !error && (
        <div className="card p-16 flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center">
            <Image size={36} className="text-gray-300 dark:text-gray-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No templates yet</h3>
            <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">
              Upload your first certificate template to get started
            </p>
          </div>
          <button onClick={() => navigate('/templates/new')} className="btn-primary mt-2">
            <Plus size={16} />
            Upload First Template
          </button>
        </div>
      )}
    </div>
  )
}

