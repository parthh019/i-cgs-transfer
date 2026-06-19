import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, Save, AlertCircle, Loader2 } from 'lucide-react'
import { templatesAPI } from '../api/endpoints'
import PlaceholderEditor from '../components/PlaceholderEditor'

export default function TemplateEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [placeholders, setPlaceholders] = useState(null)
  const [name, setName] = useState('')

  const { data: template, isLoading, error } = useQuery({
    queryKey: ['template', id],
    queryFn: () => templatesAPI.get(id).then(r => r.data),
  })

  useEffect(() => {
    if (template) {
      setName(template.name || '')
      setPlaceholders(template.placeholder_config || null)
    }
  }, [template])

  const updateMutation = useMutation({
    mutationFn: (data) => templatesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['templates'])
      queryClient.invalidateQueries(['template', id])
      toast.success('Template updated successfully!')
      navigate('/templates')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update template'),
  })

  const handleSave = () => {
    if (!name.trim()) return toast.error('Template name is required')
    updateMutation.mutate({
      name: name.trim(),
      placeholder_config: placeholders,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card p-8 flex flex-col items-center gap-4 text-center">
          <AlertCircle size={40} className="text-red-500" />
          <p className="text-gray-600 dark:text-gray-400">Failed to load template</p>
          <button onClick={() => navigate('/templates')} className="btn-secondary">
            <ArrowLeft size={16} />
            Back to Templates
          </button>
        </div>
      </div>
    )
  }

  const fileUrl = templatesAPI.getFileUrl(id)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/templates')} className="btn-secondary">
          <ArrowLeft size={16} />
          Back to Templates
        </button>
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="btn-primary"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              Save Changes
            </>
          )}
        </button>
      </div>

      <div className="card p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="label">Template Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input max-w-md"
          />
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Placeholder Configuration
          </h2>
          <PlaceholderEditor
            templateImageUrl={fileUrl}
            value={placeholders}
            onChange={setPlaceholders}
          />
        </div>
      </div>
    </div>
  )
}
