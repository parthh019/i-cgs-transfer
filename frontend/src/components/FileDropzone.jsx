import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, File, X, CheckCircle2 } from 'lucide-react'
import { formatFileSize } from '../utils/formatters'

export default function FileDropzone({
  onFileSelect,
  accept = {},
  maxSize = 50 * 1024 * 1024,
  selectedFile = null,
  onClear,
  label = 'Drop file here or click to browse',
  hint = '',
  disabled = false,
}) {
  const onDrop = useCallback(
    (accepted) => {
      if (accepted.length > 0) onFileSelect(accepted[0])
    },
    [onFileSelect]
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled: disabled || !!selectedFile,
  })

  if (selectedFile) {
    return (
      <div className="rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
              {selectedFile.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          {onClear && (
            <button
              onClick={onClear}
              className="p-1.5 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors flex-shrink-0"
            >
              <X size={16} className="text-emerald-700 dark:text-emerald-400" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
        isDragActive && !isDragReject
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-[1.01]'
          : isDragReject
          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
          : disabled
          ? 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
          : 'border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
          isDragActive && !isDragReject
            ? 'bg-primary-100 dark:bg-primary-900/40'
            : 'bg-gray-100 dark:bg-gray-800'
        }`}>
          {isDragActive && !isDragReject ? (
            <UploadCloud size={28} className="text-primary-600 dark:text-primary-400 animate-bounce" />
          ) : (
            <File size={28} className="text-gray-400 dark:text-gray-500" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {isDragActive && !isDragReject
              ? 'Release to upload'
              : isDragReject
              ? 'File type not accepted'
              : label}
          </p>
          {hint && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{hint}</p>
          )}
          {maxSize && (
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
              Max size: {formatFileSize(maxSize)}
            </p>
          )}
        </div>
        {!isDragActive && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold">
            <UploadCloud size={14} />
            Browse Files
          </span>
        )}
      </div>
    </div>
  )
}
