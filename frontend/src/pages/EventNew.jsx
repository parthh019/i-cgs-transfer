import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, CalendarDays, Loader2, ChevronDown } from 'lucide-react'
import { eventsAPI, templatesAPI } from '../api/endpoints'

export default function EventNew() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: '',
    event_date: '',
    template_id: '',
  })

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesAPI.list().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => eventsAPI.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['events'])
      toast.success('Event created successfully!')
      navigate(`/events/${res.data.id}`)
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to create event'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Event name is required')
    if (!form.event_date) return toast.error('Event date is required')
    if (!form.template_id) return toast.error('Please select a template')
    createMutation.mutate({
      name: form.name.trim(),
      event_date: form.event_date,
      template_id: parseInt(form.template_id),
    })
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/events')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Event</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Create a new certificate generation event
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {/* Event name */}
        <div>
          <label className="label">Event Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            placeholder="e.g., React Workshop — June 2025"
            className="input"
            required
          />
        </div>

        {/* Event date */}
        <div>
          <label className="label">Event Date *</label>
          <div className="relative">
            <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={form.event_date}
              onChange={set('event_date')}
              className="input pl-9"
              required
            />
          </div>
        </div>

        {/* Template selector */}
        <div>
          <label className="label">Certificate Template *</label>
          {templatesLoading ? (
            <div className="input flex items-center gap-2 text-gray-400">
              <Loader2 size={14} className="animate-spin" />
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="p-4 rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 text-sm text-yellow-700 dark:text-yellow-400">
              No templates available.{' '}
              <button
                type="button"
                onClick={() => navigate('/templates/new')}
                className="underline font-medium"
              >
                Upload a template first
              </button>
            </div>
          ) : (
            <div className="relative">
              <select
                value={form.template_id}
                onChange={set('template_id')}
                className="input pr-10 appearance-none cursor-pointer"
                required
              >
                <option value="">Select a template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Template preview */}
        {form.template_id && (
          <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 max-h-40">
            <img
              src={templatesAPI.getFileUrl(form.template_id)}
              alt="Template preview"
              className="w-full object-contain bg-gray-50 dark:bg-gray-900"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || templates.length === 0}
            className="btn-primary"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CalendarDays size={16} />
                Create Event
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
