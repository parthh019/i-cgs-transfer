import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, Upload, CheckCircle2, ChevronRight } from 'lucide-react'
import { templatesAPI } from '../api/endpoints'
import FileDropzone from '../components/FileDropzone'
import PlaceholderEditor from '../components/PlaceholderEditor'

const STEPS = [
  { id: 1, label: 'Upload File' },
  { id: 2, label: 'Configure Fields' },
]

export default function TemplateNew() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [placeholders, setPlaceholders] = useState(null)

  const createMutation = useMutation({
    mutationFn: (formData) => templatesAPI.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries(['templates'])
      toast.success('Template created successfully!')
      navigate('/templates')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to create template'),
  })

  const handleFileSelect = (f) => {
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
    if (!name) setName(f.name.replace(/\.[^/.]+$/, ''))
  }

  const handleNext = () => {
    if (!file) return toast.error('Please select a file')
    if (!name.trim()) return toast.error('Please enter a template name')
    setStep(2)
  }

  const handleSave = () => {
    if (!file || !name.trim()) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', name.trim())
    if (placeholders) {
      formData.append('placeholder_config', JSON.stringify(placeholders))
    }
    createMutation.mutate(formData)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/templates')} className="btn-secondary">
          <ArrowLeft size={16} />
          Back to Templates
        </button>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step > s.id
                  ? 'bg-emerald-500 text-white'
                  : step === s.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {step > s.id ? <CheckCircle2 size={16} /> : s.id}
              </div>
              <span className={`text-sm font-medium ${step === s.id ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight size={18} className="mx-3 text-gray-300 dark:text-gray-700" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="card p-6 space-y-5 animate-fade-in">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Upload Template File</h2>

          <div>
            <label className="label">Template Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Professional Certificate 2025"
              className="input"
            />
          </div>

          <div>
            <label className="label">Template File</label>
            <FileDropzone
              onFileSelect={handleFileSelect}
              selectedFile={file}
              onClear={() => { setFile(null); setPreviewUrl(null) }}
              accept={{
                'image/png': ['.png'],
                'image/jpeg': ['.jpg', '.jpeg'],
                'application/pdf': ['.pdf'],
              }}
              maxSize={50 * 1024 * 1024}
              label="Drop your certificate template here"
              hint="Supported: PNG, JPG, PDF"
            />
          </div>

          {/* Preview */}
          {previewUrl && file?.type?.startsWith('image/') && (
            <div>
              <label className="label">Preview</label>
              <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 max-h-64">
                <img src={previewUrl} alt="Preview" className="w-full object-contain" />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={handleNext} disabled={!file || !name} className="btn-primary">
              Next: Configure Fields
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Configure Placeholders */}
      {step === 2 && (
        <div className="card p-6 space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Configure Placeholder Fields</h2>
            <button onClick={() => setStep(1)} className="btn-secondary text-xs">
              <ArrowLeft size={14} />
              Back
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Set the position and style for each text field on your certificate.
            Click on the template image to position fields precisely.
          </p>

          <PlaceholderEditor
            templateImageUrl={previewUrl}
            onChange={setPlaceholders}
          />

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <button onClick={() => setStep(1)} className="btn-secondary">
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={createMutation.isPending}
              className="btn-primary"
            >
              {createMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Save Template
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
