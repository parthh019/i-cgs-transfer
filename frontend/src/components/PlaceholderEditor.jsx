import { useState, useRef, useCallback, useEffect } from 'react'
import { MousePointer2, Eye, EyeOff, Settings2, AlignLeft, AlignCenter, AlignRight, Target } from 'lucide-react'

const DEFAULT_FIELDS = {
  candidate_name: {
    label: 'Candidate Name',
    x: 50,
    y: 50,
    font_size: 36,
    font_color: '#1a1a1a',
    alignment: 'center',
    enabled: true,
  },
  certificate_id: {
    label: 'Certificate ID',
    x: 50,
    y: 75,
    font_size: 14,
    font_color: '#666666',
    alignment: 'center',
    enabled: true,
  },
  date: {
    label: 'Issue Date',
    x: 25,
    y: 82,
    font_size: 14,
    font_color: '#444444',
    alignment: 'center',
    enabled: true,
  },
  course_name: {
    label: 'Course Name',
    x: 50,
    y: 62,
    font_size: 20,
    font_color: '#2563eb',
    alignment: 'center',
    enabled: true,
  },
  organization_name: {
    label: 'Organization',
    x: 50,
    y: 90,
    font_size: 13,
    font_color: '#888888',
    alignment: 'center',
    enabled: false,
  },
}

const FIELD_COLORS = {
  candidate_name: '#3b82f6',
  certificate_id: '#8b5cf6',
  date: '#10b981',
  course_name: '#f59e0b',
  organization_name: '#ef4444',
}

export default function PlaceholderEditor({ templateImageUrl, value, onChange }) {
  const [fields, setFields] = useState(() => value || DEFAULT_FIELDS)
  const [activeField, setActiveField] = useState('candidate_name')
  const [isClickMode, setIsClickMode] = useState(false)
  const imageRef = useRef(null)

  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState(null)
  const canvasRef = useRef(null)

  const isPdf = templateImageUrl?.toLowerCase().includes('.pdf') || templateImageUrl?.startsWith('data:application/pdf')

  const loadPdf = useCallback(async (url) => {
    if (!url) return
    setPdfLoading(true)
    setPdfError(null)
    try {
      let pdfjsLib = window.pdfjsLib
      if (!pdfjsLib) {
        pdfjsLib = await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js'
          script.onload = () => resolve(window.pdfjsLib)
          script.onerror = () => reject(new Error('Failed to load PDF preview engine from CDN.'))
          document.head.appendChild(script)
        })
      }

      if (pdfjsLib && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js'
      }

      const loadingTask = pdfjsLib.getDocument(url)
      const pdf = await loadingTask.promise
      const page = await pdf.getPage(1)

      const canvas = canvasRef.current
      if (!canvas) return

      const context = canvas.getContext('2d')
      const viewport = page.getViewport({ scale: 2.0 })
      canvas.width = viewport.width
      canvas.height = viewport.height

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      }
      await page.render(renderContext).promise
    } catch (err) {
      console.error('PDF rendering failed:', err)
      setPdfError(err.message || 'Failed to render PDF template.')
    } finally {
      setPdfLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isPdf && templateImageUrl) {
      loadPdf(templateImageUrl)
    }
  }, [isPdf, templateImageUrl, loadPdf])

  const updateField = (fieldKey, updates) => {
    const updated = {
      ...fields,
      [fieldKey]: { ...fields[fieldKey], ...updates },
    }
    setFields(updated)
    onChange?.(updated)
  }

  const handleImageClick = useCallback(
    (e) => {
      if (!isClickMode || !activeField) return
      const rect = imageRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      updateField(activeField, { x: Math.round(x), y: Math.round(y) })
    },
    [isClickMode, activeField, fields]
  )

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Template image with markers */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Template Preview</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsClickMode(!isClickMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isClickMode
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                  : 'btn-secondary'
              }`}
            >
              {isClickMode ? (
                <>
                  <Target size={12} />
                  Click to place: {fields[activeField]?.label}
                </>
              ) : (
                <>
                  <MousePointer2 size={12} />
                  Click-to-Place Mode
                </>
              )}
            </button>
          </div>
        </div>

        <div
          ref={imageRef}
          onClick={handleImageClick}
          className={`relative rounded-xl overflow-hidden border-2 transition-all ${
            isClickMode
              ? 'border-primary-500 cursor-crosshair shadow-lg shadow-primary-500/20'
              : 'border-gray-200 dark:border-gray-700'
          } bg-gray-100 dark:bg-gray-800`}
          style={{ aspectRatio: '1.414 / 1' }}
        >
          {templateImageUrl ? (
            isPdf ? (
              <div className="w-full h-full relative">
                {pdfLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 dark:bg-gray-900/80 z-10 gap-2">
                    <div className="w-8 h-8 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
                    <p className="text-xs text-gray-500">Loading PDF template...</p>
                  </div>
                )}
                {pdfError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-red-500">
                    <p className="text-sm font-semibold mb-1">Error Loading Template</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{pdfError}</p>
                  </div>
                ) : (
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full object-contain select-none"
                  />
                )}
              </div>
            ) : (
              <img
                src={templateImageUrl}
                alt="Certificate template"
                className="w-full h-full object-contain select-none"
                draggable={false}
              />
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-400 dark:text-gray-600">
                <Settings2 size={40} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Template preview will appear here</p>
              </div>
            </div>
          )}

          {/* Field markers */}
          {Object.entries(fields).map(([key, field]) => {
            if (!field.enabled) return null
            const color = FIELD_COLORS[key] || '#3b82f6'
            const isActive = activeField === key
            return (
              <div
                key={key}
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveField(key)
                  setIsClickMode(false)
                }}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-150 ${
                  isActive ? 'z-20' : 'z-10'
                }`}
                style={{ left: `${field.x}%`, top: `${field.y}%` }}
              >
                {/* Crosshair dot */}
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    isActive ? 'scale-150 shadow-lg' : 'hover:scale-125'
                  }`}
                  style={{
                    backgroundColor: color + '40',
                    borderColor: color,
                    boxShadow: isActive ? `0 0 0 4px ${color}30` : undefined,
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                </div>
                {/* Label */}
                {isActive && (
                  <div
                    className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-lg"
                    style={{ backgroundColor: color }}
                  >
                    {field.label}
                  </div>
                )}
              </div>
            )
          })}

          {isClickMode && (
            <div className="absolute inset-0 pointer-events-none border-2 border-primary-500 rounded-xl">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Click to place: {fields[activeField]?.label}
              </div>
            </div>
          )}
        </div>

        {templateImageUrl && (
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-2 text-center">
            Click a marker to select it • Enable Click-to-Place mode to reposition
          </p>
        )}
      </div>

      {/* Field configuration panel */}
      <div className="xl:w-80 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Field Configuration</h3>
        <div className="space-y-2">
          {Object.entries(fields).map(([key, field]) => {
            const color = FIELD_COLORS[key] || '#3b82f6'
            const isActive = activeField === key
            return (
              <div
                key={key}
                onClick={() => setActiveField(key)}
                className={`rounded-xl border p-3 cursor-pointer transition-all duration-150 ${
                  isActive
                    ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {field.label}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateField(key, { enabled: !field.enabled })
                    }}
                    className={`p-1 rounded-lg transition-colors ${
                      field.enabled
                        ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    title={field.enabled ? 'Disable field' : 'Enable field'}
                  >
                    {field.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>

                {isActive && field.enabled && (
                  <div className="mt-3 space-y-3" onClick={e => e.stopPropagation()}>
                    {/* Position */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="label text-xs">X (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={field.x}
                          onChange={(e) => updateField(key, { x: Number(e.target.value) })}
                          className="input text-xs py-1.5"
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Y (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={field.y}
                          onChange={(e) => updateField(key, { y: Number(e.target.value) })}
                          className="input text-xs py-1.5"
                        />
                      </div>
                    </div>

                    {/* Font size and color */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="label text-xs">Font Size</label>
                        <input
                          type="number"
                          min={8}
                          max={120}
                          value={field.font_size}
                          onChange={(e) => updateField(key, { font_size: Number(e.target.value) })}
                          className="input text-xs py-1.5"
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Color</label>
                        <div className="flex gap-1.5">
                          <input
                            type="color"
                            value={field.font_color}
                            onChange={(e) => updateField(key, { font_color: e.target.value })}
                            className="w-10 h-9 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5 bg-white dark:bg-gray-900"
                          />
                          <input
                            type="text"
                            value={field.font_color}
                            onChange={(e) => updateField(key, { font_color: e.target.value })}
                            className="input text-xs py-1.5 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Alignment */}
                    <div>
                      <label className="label text-xs">Alignment</label>
                      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {[
                          { value: 'left', Icon: AlignLeft },
                          { value: 'center', Icon: AlignCenter },
                          { value: 'right', Icon: AlignRight },
                        ].map(({ value: val, Icon }) => (
                          <button
                            key={val}
                            onClick={() => updateField(key, { alignment: val })}
                            className={`flex-1 p-2 flex items-center justify-center transition-colors ${
                              field.alignment === val
                                ? 'bg-primary-600 text-white'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            <Icon size={14} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsClickMode(true)
                        setActiveField(key)
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400 text-xs font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                    >
                      <Target size={12} />
                      Click on template to reposition
                    </button>
                  </div>
                )}

                {!field.enabled && (
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Disabled — won't appear on certificate</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
